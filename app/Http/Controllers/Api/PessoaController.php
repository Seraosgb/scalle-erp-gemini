<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pessoa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PessoaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Pessoa::where('tenant_id', $tenantId)->with('enderecos');

        if ($request->filled('tipo')) {
            if ($request->get('tipo') === 'FORNECEDOR') {
                $query->where('is_fornecedor', true);
            } elseif ($request->get('tipo') === 'CLIENTE') {
                $query->where('is_cliente', true);
            }
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome_razao_social', 'ILIKE', "%{$search}%")
                  ->orWhere('nome_fantasia_apelido', 'ILIKE', "%{$search}%")
                  ->orWhere('cpf_cnpj', 'ILIKE', "%{$search}%");
            });
        }

        $pessoas = $query->orderBy('nome_razao_social')->get();

        return response()->json(['data' => $pessoas]);
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
        ]);

        $validated['id'] = (string) Str::uuid();
        $validated['tenant_id'] = $request->user()->tenant_id;
        $validated['is_cliente'] = $validated['is_cliente'] ?? false;
        $validated['is_fornecedor'] = $validated['is_fornecedor'] ?? false;
        $validated['is_ativo'] = true;

        $pessoa = Pessoa::create($validated);

        return response()->json(['data' => $pessoa], 201);
    }

    public function show(string $id): JsonResponse
    {
        $pessoa = Pessoa::with('enderecos')->findOrFail($id);
        return response()->json(['data' => $pessoa]);
    }
}