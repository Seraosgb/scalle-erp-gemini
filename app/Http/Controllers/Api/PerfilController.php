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
        
        $query = Perfil::where('tenant_id', $tenantId)->with('permissoes');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where('nome', 'ILIKE', "%{$search}%");
        }

        $perfis = $query->orderBy('nome')->get();
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

        if (!empty($validated['permissoes']) && !$perfil->is_admin) {
            $perfil->permissoes()->sync($validated['permissoes']);
        }

        return response()->json(['data' => $perfil->load('permissoes')], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $perfil = Perfil::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:100',
            'descricao' => 'nullable|string|max:255',
            'is_admin' => 'boolean',
            'permissoes' => 'nullable|array',
            'permissoes.*' => 'uuid|exists:sis_permissoes,id',
        ]);

        $perfil->update([
            'nome' => $validated['nome'],
            'descricao' => $validated['descricao'] ?? null,
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        if ($perfil->is_admin) {
            $perfil->permissoes()->detach();
        } else {
            $perfil->permissoes()->sync($validated['permissoes'] ?? []);
        }

        return response()->json(['data' => $perfil->load('permissoes')]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $perfil = Perfil::where('tenant_id', $tenantId)->findOrFail($id);

        if ($perfil->is_sistema) {
            return response()->json([
                'error' => [
                    'code' => 'SYSTEM_ROLE_PROTECTED',
                    'message' => 'Perfis protegidos do sistema não podem ser excluídos.',
                ]
            ], 422);
        }

        $perfil->delete();

        return response()->json(['data' => ['message' => 'Perfil de acesso removido.']]);
    }
}