<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Perfil;
use App\Models\Permissao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PerfilController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $perfis = Perfil::where('tenant_id', $tenantId)
            ->with('permissoes')
            ->orderBy('nome')
            ->get();

        $todasPermissoes = Permissao::orderBy('modulo')->orderBy('nome')->get();

        return response()->json([
            'data' => [
                'perfis' => $perfis,
                'permissoes' => $todasPermissoes,
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'descricao' => 'nullable|string|max:255',
            'is_admin' => 'boolean',
            'permissoes' => 'nullable|array',
            'permissoes.*' => 'uuid|exists:sis_permissoes,id',
        ]);

        $perfil = Perfil::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'nome' => $validated['nome'],
            'slug' => Str::slug($validated['nome']) . '-' . substr((string) Str::uuid(), 0, 4),
            'descricao' => $validated['descricao'] ?? null,
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        if (!empty($validated['permissoes'])) {
            $perfil->permissoes()->sync($validated['permissoes']);
        }

        return response()->json(['data' => $perfil->load('permissoes')], 201);
    }
}