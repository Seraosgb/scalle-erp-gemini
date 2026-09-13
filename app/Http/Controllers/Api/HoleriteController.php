<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colaborador;
use App\Models\Empresa;
use App\Models\Holerite;
use App\Models\HoleriteItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class HoleriteController extends Controller
{
    // ==========================================
    // PORTAL DO COLABORADOR
    // ==========================================

    public function meusHolerites(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            // Busca o colaborador vinculado ao usuário logado
            $colaborador = Colaborador::where('tenant_id', $tenantId)
                ->where('usuario_id', $request->user()->id)
                ->first();

            if (!$colaborador) {
                return response()->json([
                    'error' => [
                        'code' => 'COLABORADOR_NAO_VINCULADO',
                        'message' => 'Este usuário do sistema não possui uma ficha de colaborador vinculada no RH. Cadastre o colaborador e vincule o usuário.'
                    ]
                ], 422);
            }

            $holerites = Holerite::where('colaborador_id', $colaborador->id)
                ->orderByDesc('competencia')
                ->get();

            return response()->json(['data' => $holerites]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro ao listar meus holerites: ' . $e->getMessage()]], 500);
        }
    }

    public function baixarMeuPdf(Request $request, string $id)
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $colaborador = Colaborador::where('tenant_id', $tenantId)
                ->where('usuario_id', $request->user()->id)
                ->first();

            if (!$colaborador) {
                return response()->json([
                    'error' => ['message' => 'Usuário sem vínculo de colaborador ativo para emissão de PDF.']
                ], 422);
            }

            $holerite = Holerite::where('colaborador_id', $colaborador->id)
                ->with(['colaborador.pessoa', 'itens'])
                ->findOrFail($id);

            // Garante que a view Blade do PDF existe
            if (!view()->exists('pdfs.holerite')) {
                return response()->json([
                    'error' => ['message' => 'Template de PDF do holerite (resources/views/pdfs/holerite.blade.php) não encontrado no servidor.']
                ], 500);
            }

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.holerite', ['holerite' => $holerite])
                ->setPaper('a4', 'portrait');

            return $pdf->download("Holerite_{$holerite->competencia}.pdf");

        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'PDF_GENERATION_ERROR',
                    'message' => 'Erro ao gerar PDF: ' . $e->getMessage()
                ]
            ], 500);
        }
    }

    // ==========================================
    // GESTÃO DE RH (ADMIN)
    // ==========================================

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $holerites = Holerite::where('tenant_id', $tenantId)
            ->with(['colaborador.pessoa:id,nome_razao_social,cpf_cnpj'])
            ->orderByDesc('competencia')
            ->orderByDesc('data_emissao')
            ->paginate(15);

        return response()->json($holerites);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $holerite = Holerite::where('tenant_id', $tenantId)
            ->with(['colaborador.pessoa', 'itens.rubrica'])
            ->findOrFail($id);

        return response()->json(['data' => $holerite]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $validated = $request->validate([
            'colaborador_id' => 'required|uuid|exists:rh_colaboradores,id',
            'competencia' => 'required|string|size:7',
            'data_emissao' => 'required|date',
            'observacoes' => 'nullable|string',
            'itens' => 'required|array|min:1',
            'itens.*.tipo' => 'required|string|in:PROVENTO,DESCONTO',
            'itens.*.rubrica_id' => 'nullable|uuid|exists:sis_tabelas_dominio,id',
            'itens.*.descricao' => 'required|string|max:150',
            'itens.*.referencia' => 'nullable|string|max:50',
            'itens.*.valor' => 'required|numeric|min:0',
        ]);

        $colaborador = Colaborador::where('tenant_id', $tenantId)->findOrFail($validated['colaborador_id']);

        $holeriteGerado = DB::transaction(function () use ($validated, $tenantId, $empresaId, $colaborador) {
            $totalProventos = 0;
            $totalDescontos = 0;

            foreach ($validated['itens'] as $item) {
                if ($item['tipo'] === 'PROVENTO') {
                    $totalProventos += (float) $item['valor'];
                } else {
                    $totalDescontos += (float) $item['valor'];
                }
            }

            $valorLiquido = max(0, $totalProventos - $totalDescontos);

            $holerite = Holerite::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'colaborador_id' => $colaborador->id,
                'competencia' => $validated['competencia'],
                'data_emissao' => $validated['data_emissao'],
                'salario_base' => $colaborador->salario_base,
                'total_proventos' => $totalProventos,
                'total_descontos' => $totalDescontos,
                'valor_liquido' => $valorLiquido,
                'status' => 'GERADO',
                'observacoes' => $validated['observacoes'] ?? null,
            ]);

            foreach ($validated['itens'] as $item) {
                HoleriteItem::create([
                    'id' => (string) Str::uuid(),
                    'holerite_id' => $holerite->id,
                    'tipo' => $item['tipo'],
                    'rubrica_id' => $item['rubrica_id'] ?? null,
                    'descricao' => $item['descricao'],
                    'referencia' => $item['referencia'] ?? null,
                    'valor' => (float) $item['valor'],
                ]);
            }

            return $holerite;
        });

        return response()->json([
            'data' => [
                'message' => 'Holerite processado com sucesso!',
                'holerite' => $holeriteGerado->load(['itens', 'colaborador.pessoa']),
            ]
        ], 201);
    }
}
