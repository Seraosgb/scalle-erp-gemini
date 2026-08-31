<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Endereco;
use App\Models\Pessoa;
use App\Services\DocumentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PessoaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Pessoa::where('tenant_id', $tenantId)->with('enderecos');

        if ($request->filled('tipo')) {
            $tipo = strtoupper($request->get('tipo'));
            if ($tipo === 'FORNECEDOR') $query->where('is_fornecedor', true);
            elseif ($tipo === 'CLIENTE') $query->where('is_cliente', true);
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome_razao_social', 'ILIKE', "%{$search}%")
                  ->orWhere('nome_fantasia_apelido', 'ILIKE', "%{$search}%")
                  ->orWhere('cpf_cnpj', 'ILIKE', "%{$search}%");
            });
        }

        $pessoas = $query->orderBy('nome_razao_social')->paginate(20);
        return response()->json($pessoas);
    }

    public function consultarCnpj(Request $request, string $cnpj): JsonResponse
    {
        $dados = DocumentoService::consultarCnpjReceitaWs($cnpj);

        if (!$dados) {
            return response()->json([
                'error' => [
                    'code' => 'CNPJ_CONSULTA_FALHOU',
                    'message' => 'CNPJ inválido ou serviço da Receita Federal indisponível no momento.',
                ]
            ], 404);
        }

        return response()->json(['data' => $dados]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo_pessoa' => 'required|string|in:PF,PJ',
            'nome_razao_social' => 'required|string|max:200',
            'nome_fantasia_apelido' => 'nullable|string|max:200',
            'cpf_cnpj' => 'required|string|max:20',
            'email_principal' => 'nullable|email|max:150',
            'telefone_principal' => 'nullable|string|max:30',
            'is_cliente' => 'nullable|boolean',
            'is_fornecedor' => 'nullable|boolean',
            'is_tecnico' => 'nullable|boolean',
            'is_transportadora' => 'nullable|boolean',
            'enderecos' => 'nullable|array',
            'enderecos.*.cep' => 'nullable|string|max:10',
            'enderecos.*.logradouro' => 'nullable|string|max:150',
            'enderecos.*.numero' => 'nullable|string|max:20',
            'enderecos.*.bairro' => 'nullable|string|max:100',
            'enderecos.*.cidade' => 'nullable|string|max:100',
            'enderecos.*.uf' => 'nullable|string|size:2',
        ]);

        $cpfCnpjLimpo = preg_replace('/[^0-9]/', '', $validated['cpf_cnpj']);

        // Validação Matemática Estrita (Padrão Gemini)
        if (!DocumentoService::validarCpfCnpj($cpfCnpjLimpo)) {
            return response()->json(['error' => ['message' => 'CPF ou CNPJ informado é matematicamente inválido.']], 422);
        }

        $tenantId = $request->user()->tenant_id;

        // Evita duplicidade no mesmo tenant
        if (Pessoa::where('tenant_id', $tenantId)->where('cpf_cnpj', $cpfCnpjLimpo)->exists()) {
            return response()->json(['error' => ['message' => 'Este documento já está cadastrado em sua base.']], 422);
        }

        $pessoa = DB::transaction(function () use ($validated, $cpfCnpjLimpo, $tenantId) {
            $p = Pessoa::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'tipo_pessoa' => $validated['tipo_pessoa'],
                'nome_razao_social' => $validated['nome_razao_social'],
                'nome_fantasia_apelido' => $validated['nome_fantasia_apelido'] ?? null,
                'cpf_cnpj' => $cpfCnpjLimpo,
                'email_principal' => $validated['email_principal'] ?? null,
                'telefone_principal' => $validated['telefone_principal'] ?? null,
                'is_cliente' => $validated['is_cliente'] ?? false,
                'is_fornecedor' => $validated['is_fornecedor'] ?? false,
                'is_tecnico' => $validated['is_tecnico'] ?? false,
                'is_transportadora' => $validated['is_transportadora'] ?? false,
                'is_ativo' => true,
            ]);

            if (!empty($validated['enderecos'])) {
                foreach ($validated['enderecos'] as $end) {
                    Endereco::create(array_merge($end, [
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'pessoa_id' => $p->id,
                        'tipo_endereco' => 'PRINCIPAL',
                    ]));
                }
            }

            return $p;
        });

        return response()->json(['data' => $pessoa->load('enderecos')], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;
        $pessoa = Pessoa::where('tenant_id', $tenantId)->with('enderecos')->findOrFail($id);
        return response()->json(['data' => $pessoa]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pessoa = Pessoa::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome_razao_social' => 'required|string|max:200',
            'nome_fantasia_apelido' => 'nullable|string|max:200',
            'email_principal' => 'nullable|email|max:150',
            'telefone_principal' => 'nullable|string|max:30',
            'is_cliente' => 'nullable|boolean',
            'is_fornecedor' => 'nullable|boolean',
            'is_tecnico' => 'nullable|boolean',
            'is_transportadora' => 'nullable|boolean',
            'is_ativo' => 'nullable|boolean',
            'enderecos' => 'nullable|array',
        ]);

        DB::transaction(function () use ($validated, $pessoa, $tenantId) {
            $pessoa->update([
                'nome_razao_social' => $validated['nome_razao_social'],
                'nome_fantasia_apelido' => $validated['nome_fantasia_apelido'] ?? $pessoa->nome_fantasia_apelido,
                'email_principal' => $validated['email_principal'] ?? $pessoa->email_principal,
                'telefone_principal' => $validated['telefone_principal'] ?? $pessoa->telefone_principal,
                'is_cliente' => $validated['is_cliente'] ?? $pessoa->is_cliente,
                'is_fornecedor' => $validated['is_fornecedor'] ?? $pessoa->is_fornecedor,
                'is_tecnico' => $validated['is_tecnico'] ?? $pessoa->is_tecnico,
                'is_transportadora' => $validated['is_transportadora'] ?? $pessoa->is_transportadora,
                'is_ativo' => $validated['is_ativo'] ?? $pessoa->is_ativo,
            ]);

            if (isset($validated['enderecos'])) {
                Endereco::where('tenant_id', $tenantId)->where('pessoa_id', $pessoa->id)->delete();
                foreach ($validated['enderecos'] as $end) {
                    Endereco::create(array_merge($end, [
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenantId,
                        'pessoa_id' => $pessoa->id,
                        'tipo_endereco' => 'PRINCIPAL',
                    ]));
                }
            }
        });

        return response()->json(['data' => $pessoa->fresh('enderecos')]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pessoa = Pessoa::where('tenant_id', $tenantId)->findOrFail($id);

        // O Soft Delete preserva a integridade de OS, Vendas e Compras históricas (Blindagem Arquitetural)
        $pessoa->delete();

        return response()->json(['data' => ['message' => 'Cadastro removido com sucesso (Soft Delete).']]);
    }
}
