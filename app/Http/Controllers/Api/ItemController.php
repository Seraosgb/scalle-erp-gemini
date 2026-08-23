<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Deposito;
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
        $item = Item::create($validated);

        return response()->json(['data' => $item], 201);
    }

    public function kardex(string $id): JsonResponse
    {
        // Consulta no model correto (MovimentacaoEstoque) ordenado por created_at
        $movimentos = MovimentacaoEstoque::where('item_id', $id)
            ->with(['deposito'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $movimentos]);
    }

    public function depositos(): JsonResponse
    {
        $depositos = Deposito::where('is_ativo', true)->orderBy('nome')->get();
        return response()->json(['data' => $depositos]);
    }

    public function importarXml(Request $request): JsonResponse
    {
        $request->validate([
            'xml_file' => 'required|file|mimes:xml,txt',
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