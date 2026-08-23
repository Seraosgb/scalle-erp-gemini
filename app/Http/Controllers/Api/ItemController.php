<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\EstoqueDeposito;
use App\Models\Item;
use App\Models\MovimentacaoEstoque;
use App\Services\EstoqueService;
use App\Services\ImportadorXmlNfeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Item::query()->with('saldosPorDeposito.deposito');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'ILIKE', "%{$search}%")
                  ->orWhere('codigo_sku', 'ILIKE', "%{$search}%")
                  ->orWhere('codigo_barras_ean', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->filled('tipo')) {
            $query->where('tipo_item', $request->get('tipo'));
        }

        $itens = $query->orderBy('nome')->paginate(15);

        return response()->json($itens);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:200',
            'codigo_sku' => 'required|string|max:50',
            'tipo_item' => 'required|string|in:PRODUTO,SERVICO,MATERIA_PRIMA,INSUMO',
            'preco_venda' => 'required|numeric|min:0',
            'preco_custo' => 'nullable|numeric|min:0',
            'unidade_medida' => 'required|string|max:10',
            'ncm' => 'nullable|string|max:10',
            'controla_estoque' => 'boolean',
        ]);

        $validated['id'] = (string) Str::uuid();
        $validated['tenant_id'] = $request->user()->tenant_id;
        $item = Item::create($validated);

        return response()->json(['data' => $item], 201);
    }

    public function kardex(string $id): JsonResponse
    {
        $movimentos = MovimentacaoEstoque::where('item_id', $id)
            ->with(['deposito'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $movimentos]);
    }

    public function depositos(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresa = $request->user()->empresaPadrao ?? Empresa::where('tenant_id', $tenantId)->first() ?? Empresa::first();
        $empresaId = $empresa?->id;

        // Auto-provisionamento resiliente do depósito padrão
        if ($empresaId && Deposito::where('empresa_id', $empresaId)->count() === 0) {
            Deposito::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'nome' => 'Depósito Central / Matriz',
                'codigo' => 'DEP-01',
                'descricao' => 'Almoxarifado Geral de Operações',
                'is_padrao' => true,
                'is_ativo' => true,
            ]);
        }

        $depositos = Deposito::where('is_ativo', true)
            ->withCount('saldos')
            ->orderByDesc('is_padrao')
            ->orderBy('nome')
            ->get();

        return response()->json(['data' => $depositos]);
    }

    public function storeDeposito(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'codigo' => 'required|string|max:30',
            'descricao' => 'nullable|string|max:255',
            'is_padrao' => 'nullable|boolean',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresa = $request->user()->empresaPadrao ?? Empresa::where('tenant_id', $tenantId)->first() ?? Empresa::first();
        
        if (!$empresa) {
            return response()->json([
                'error' => [
                    'code' => 'COMPANY_NOT_FOUND',
                    'message' => 'Nenhuma empresa ativa vinculada ao usuário para cadastrar o depósito.',
                ]
            ], 422);
        }

        $isPadrao = !empty($validated['is_padrao']) && $validated['is_padrao'];

        if ($isPadrao) {
            Deposito::where('empresa_id', $empresa->id)->update(['is_padrao' => false]);
        }

        $deposito = Deposito::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'empresa_id' => $empresa->id,
            'nome' => $validated['nome'],
            'codigo' => strtoupper($validated['codigo']),
            'descricao' => $validated['descricao'] ?? null,
            'is_padrao' => $isPadrao,
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $deposito], 201);
    }

    public function importarXml(Request $request): JsonResponse
    {
        $request->validate([
            'xml_file' => 'required|file',
            'deposito_id' => 'required|uuid|exists:wms_depositos,id',
        ]);

        $xmlConteudo = file_get_contents($request->file('xml_file')->getRealPath());
        $empresaId = $request->user()->empresa_padrao_id ?? Deposito::find($request->deposito_id)->empresa_id;

        $resultado = ImportadorXmlNfeService::processarXml(
            $xmlConteudo,
            $empresaId,
            $request->deposito_id,
            $request->user()->id
        );

        return response()->json([
            'data' => [
                'message' => 'XML de NF-e importado e estoque provisionado com sucesso!',
                'compra' => $resultado,
            ]
        ]);
    }
}