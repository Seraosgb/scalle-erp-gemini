<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PmoConfigController extends Controller
{
    // Mapa seguro que traduz a rota para a tabela correta no banco
    private array $tabelas = [
        'status' => 'prj_status_projetos',
        'prioridades' => 'prj_prioridades_tarefas',
        'tipos' => 'prj_tipos_projetos',
        'departamentos' => 'prj_departamentos',
        'categorias_custos' => 'prj_categorias_custos',
    ];

    private function getTabela(string $dominio): ?string
    {
        return $this->tabelas[$dominio] ?? null;
    }

    public function index(Request $request, string $dominio): JsonResponse
    {
        $tabela = $this->getTabela($dominio);
        if (!$tabela) return response()->json(['message' => 'Domínio inválido'], 400);

        $tenantId = $request->user()->tenant_id;
        $dados = DB::table($tabela)->where('tenant_id', $tenantId)->orderBy('nome')->get();

        return response()->json(['data' => $dados]);
    }

    public function store(Request $request, string $dominio): JsonResponse
    {
        $tabela = $this->getTabela($dominio);
        if (!$tabela) return response()->json(['message' => 'Domínio inválido'], 400);

        $payload = $request->validate([
            'nome' => 'required|string|max:100',
            'cor_hex' => 'nullable|string|max:7',
            'peso' => 'nullable|integer'
        ]);

        $payload['id'] = (string) Str::uuid();
        $payload['tenant_id'] = $request->user()->tenant_id;
        $payload['created_at'] = now();
        $payload['updated_at'] = now();

        DB::table($tabela)->insert($payload);

        return response()->json(['message' => 'Registro criado com sucesso!', 'data' => $payload], 201);
    }

    public function update(Request $request, string $dominio, string $id): JsonResponse
    {
        $tabela = $this->getTabela($dominio);
        if (!$tabela) return response()->json(['message' => 'Domínio inválido'], 400);

        $payload = $request->validate([
            'nome' => 'required|string|max:100',
            'cor_hex' => 'nullable|string|max:7',
            'peso' => 'nullable|integer'
        ]);
        $payload['updated_at'] = now();

        DB::table($tabela)->where('tenant_id', $request->user()->tenant_id)->where('id', $id)->update($payload);

        return response()->json(['message' => 'Registro atualizado com sucesso!']);
    }

    public function destroy(Request $request, string $dominio, string $id): JsonResponse
    {
        $tabela = $this->getTabela($dominio);
        if (!$tabela) return response()->json(['message' => 'Domínio inválido'], 400);

        DB::table($tabela)->where('tenant_id', $request->user()->tenant_id)->where('id', $id)->delete();
        return response()->json(['message' => 'Registro excluído!']);
    }
}
