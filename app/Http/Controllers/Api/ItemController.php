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
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Item::where('tenant_id', $tenantId)->with('saldosPorDeposito.deposito');

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
        $validated['is_ativo'] = true;
        $item = Item::create($validated);

        return response()->json(['data' => $item], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $item = Item::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:200',
            'codigo_sku' => 'required|string|max:50',
            'tipo_item' => 'required|string|in:PRODUTO,SERVICO,MATERIA_PRIMA,INSUMO',
            'preco_venda' => 'required|numeric|min:0',
            'preco_custo' => 'nullable|numeric|min:0',
            'unidade_medida' => 'required|string|max:10',
            'ncm' => 'nullable|string|max:10',
            'controla_estoque' => 'boolean',
            'is_ativo' => 'boolean',
        ]);

        $item->update($validated);

        return response()->json(['data' => $item]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $item = Item::where('tenant_id', $tenantId)->findOrFail($id);

        // Soft Delete seguro
        $item->delete();

        return response()->json(['data' => ['message' => 'Item removido do catálogo com sucesso.']]);
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
        
        $empresa = $request->user()->empresaPadrao 
                ?? Empresa::where('tenant_id', $tenantId)->first()
                ?? Empresa::firstOrCreate(
                    ['tenant_id' => $tenantId],
                    [
                        'id' => (string) Str::uuid(),
                        'razao_social' => 'Scalle Enterprise Matriz',
                        'nome_fantasia' => 'Scalle Matriz',
                        'cnpj' => '00.000.000/0001-91',
                        'regime_tributario' => 'simples_nacional',
                        'is_matriz' => true,
                    ]
                );

        $empresaId = $empresa->id;

        if (Deposito::where('empresa_id', $empresaId)->count() === 0) {
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

        $query = Deposito::where('empresa_id', $empresaId);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'ILIKE', "%{$search}%")
                  ->orWhere('codigo', 'ILIKE', "%{$search}%");
            });
        }

        $depositos = $query->withCount('saldos')
            ->orderByDesc('is_padrao')
            ->orderBy('nome')
            ->get();

        return response()->json(['data' => $depositos]);
    }

    public function storeDeposito(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $empresa = $request->user()->empresaPadrao 
                ?? Empresa::where('tenant_id', $tenantId)->first()
                ?? Empresa::first();

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'codigo' => 'required|string|max:30',
            'descricao' => 'nullable|string|max:255',
            'is_padrao' => 'nullable|boolean',
        ]);

        $codigoFormatado = strtoupper(trim($validated['codigo']));

        $jaExiste = Deposito::where('empresa_id', $empresa->id)
            ->where('codigo', $codigoFormatado)
            ->exists();

        if ($jaExiste) {
            return response()->json([
                'error' => [
                    'code' => 'DUPLICATE_CODE',
                    'message' => "Já existe um depósito com o código '{$codigoFormatado}' nesta empresa.",
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
            'codigo' => $codigoFormatado,
            'descricao' => $validated['descricao'] ?? null,
            'is_padrao' => $isPadrao,
            'is_ativo' => true,
        ]);

        return response()->json(['data' => $deposito], 201);
    }

    public function updateDeposito(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $deposito = Deposito::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'codigo' => 'required|string|max:30',
            'descricao' => 'nullable|string|max:255',
            'is_padrao' => 'nullable|boolean',
            'is_ativo' => 'boolean',
        ]);

        $codigoFormatado = strtoupper(trim($validated['codigo']));

        $jaExiste = Deposito::where('empresa_id', $deposito->empresa_id)
            ->where('codigo', $codigoFormatado)
            ->where('id', '!=', $id)
            ->exists();

        if ($jaExiste) {
            return response()->json([
                'error' => [
                    'code' => 'DUPLICATE_CODE',
                    'message' => "Já existe outro depósito com o código '{$codigoFormatado}'.",
                ]
            ], 422);
        }

        $isPadrao = !empty($validated['is_padrao']) && $validated['is_padrao'];

        if ($isPadrao) {
            Deposito::where('empresa_id', $deposito->empresa_id)->update(['is_padrao' => false]);
        }

        $deposito->update([
            'nome' => $validated['nome'],
            'codigo' => $codigoFormatado,
            'descricao' => $validated['descricao'] ?? null,
            'is_padrao' => $isPadrao,
            'is_ativo' => $validated['is_ativo'] ?? $deposito->is_ativo,
        ]);

        return response()->json(['data' => $deposito]);
    }

    public function destroyDeposito(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $deposito = Deposito::where('tenant_id', $tenantId)->findOrFail($id);

        if ($deposito->is_padrao) {
            return response()->json([
                'error' => [
                    'code' => 'PADRAO_DELETE_FORBIDDEN',
                    'message' => 'O depósito padrão da empresa não pode ser excluído.',
                ]
            ], 422);
        }

        $deposito->delete();

        return response()->json(['data' => ['message' => 'Depósito removido com sucesso.']]);
    }

    public function ajustarSaldo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deposito_id' => 'required|uuid|exists:wms_depositos,id',
            'item_id' => 'required|uuid|exists:pro_itens,id',
            'novo_saldo' => 'required|numeric|min:0',
            'motivo' => 'required|string|max:255',
            'lote' => 'nullable|string|max:50',
            'data_validade' => 'nullable|date',
            'localizacao_rua' => 'nullable|string|max:20',
            'localizacao_predio' => 'nullable|string|max:20',
            'localizacao_nivel' => 'nullable|string|max:20',
            'localizacao_vao' => 'nullable|string|max:20',
        ]);

        try {
            DB::transaction(function () use ($validated, $request) {
                $saldoAtual = EstoqueDeposito::where('deposito_id', $validated['deposito_id'])
                    ->where('item_id', $validated['item_id'])
                    ->when(!empty($validated['lote']), fn($q) => $q->where('lote', $validated['lote']))
                    ->lockForUpdate()
                    ->first();

                $quantidadeAtual = $saldoAtual ? (float) $saldoAtual->quantidade_saldo : 0.00;
                $novoSaldo = (float) $validated['novo_saldo'];
                $diferenca = $novoSaldo - $quantidadeAtual;

                if ($diferenca == 0) {
                    return;
                }

                $tipoMovimento = 'AJUSTE_INVENTARIO';
                $quantidadeMovimentar = abs($diferenca);

                if (!$saldoAtual) {
                    $saldoAtual = EstoqueDeposito::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $request->user()->tenant_id,
                        'deposito_id' => $validated['deposito_id'],
                        'item_id' => $validated['item_id'],
                        'lote' => $validated['lote'] ?? null,
                        'data_validade' => $validated['data_validade'] ?? null,
                        'localizacao_rua' => $validated['localizacao_rua'] ?? null,
                        'localizacao_predio' => $validated['localizacao_predio'] ?? null,
                        'localizacao_nivel' => $validated['localizacao_nivel'] ?? null,
                        'localizacao_vao' => $validated['localizacao_vao'] ?? null,
                        'quantidade_saldo' => 0.0000,
                        'quantidade_reservada' => 0.0000,
                    ]);
                } else {
                    $saldoAtual->update([
                        'localizacao_rua' => $validated['localizacao_rua'] ?? $saldoAtual->localizacao_rua,
                        'localizacao_predio' => $validated['localizacao_predio'] ?? $saldoAtual->localizacao_predio,
                        'localizacao_nivel' => $validated['localizacao_nivel'] ?? $saldoAtual->localizacao_nivel,
                        'localizacao_vao' => $validated['localizacao_vao'] ?? $saldoAtual->localizacao_vao,
                    ]);
                }

                $saldoAtual->update(['quantidade_saldo' => $novoSaldo]);

                MovimentacaoEstoque::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $request->user()->tenant_id,
                    'deposito_id' => $validated['deposito_id'],
                    'item_id' => $validated['item_id'],
                    'usuario_id' => $request->user()->id,
                    'tipo_movimento' => $tipoMovimento,
                    'quantidade' => $quantidadeMovimentar,
                    'saldo_anterior' => $quantidadeAtual,
                    'saldo_posterior' => $novoSaldo,
                    'custo_unitario' => 0.00,
                    'documento_origem_tipo' => 'inventario',
                    'motivo' => $validated['motivo'] . ' (Ajuste de ' . ($diferenca > 0 ? '+' : '-') . $quantidadeMovimentar . ')',
                    'created_at' => now(),
                ]);
            });

            return response()->json(['data' => ['message' => 'Inventário atualizado com sucesso!']]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function transferir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deposito_origem_id' => 'required|uuid|exists:wms_depositos,id|different:deposito_destino_id',
            'deposito_destino_id' => 'required|uuid|exists:wms_depositos,id',
            'item_id' => 'required|uuid|exists:pro_itens,id',
            'quantidade' => 'required|numeric|min:0.0001',
            'modalidade' => 'required|string|in:DIRETO,EM_TRANSITO',
            'observacoes' => 'nullable|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($validated, $request) {
                $origemId = $validated['deposito_origem_id'];
                $destinoId = $validated['deposito_destino_id'];
                $itemId = $validated['item_id'];
                $qtd = (float) $validated['quantidade'];
                $userId = $request->user()->id;

                EstoqueService::movimentar(
                    $origemId,
                    $itemId,
                    $qtd,
                    'TRANSFERENCIA_SAIDA',
                    $userId,
                    'transferencias',
                    null,
                    null,
                    0.00
                );

                if ($validated['modalidade'] === 'DIRETO') {
                    EstoqueService::movimentar(
                        $destinoId,
                        $itemId,
                        $qtd,
                        'TRANSFERENCIA_ENTRADA',
                        $userId,
                        'transferencias',
                        null,
                        null,
                        0.00
                    );
                }
            });

            return response()->json(['data' => ['message' => 'Transferência executada com sucesso!']]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
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