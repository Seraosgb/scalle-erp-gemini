<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Empresa;
use App\Models\GedDocumento;
use App\Models\GedPasta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GedController extends Controller
{
    public function listar(Request $request): JsonResponse
    {
        $tenantId =$request->user()->tenant_id;
        $pastaId =$request->get('pasta_id');

        $pastas = GedPasta::where('tenant_id',$tenantId)
            ->where('pasta_pai_id', $pastaId)
            ->orderBy('nome')
            ->get();

        $documentos = GedDocumento::where('tenant_id',$tenantId)
            ->where('pasta_id', $pastaId)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get();

        $caminho = [];
        if ($pastaId) {
            $atual = GedPasta::find($pastaId);
            while ($atual) {
                array_unshift($caminho, ['id' => $atual->id, 'nome' =>$atual->nome]);
                $atual = GedPasta::find($atual->pasta_pai_id);
            }
        }

        return response()->json([
            'data' => [
                'caminho' => $caminho,
                'pastas' => $pastas,
                'documentos' => $documentos,
            ]
        ]);
    }

    public function criarPasta(Request $request): JsonResponse
    {
        $tenantId =$request->user()->tenant_id;
        $validated =$request->validate([
            'nome' => 'required|string|max:150',
            'pasta_pai_id' => 'nullable|uuid|exists:ged_pastas,id',
        ]);

        $pasta = GedPasta::create([
            'tenant_id' => $tenantId,
            'empresa_id' => $request->user()->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()?->id,
            'pasta_pai_id' => $validated['pasta_pai_id'] ?? null,
            'nome' => $validated['nome'],
        ]);

        return response()->json(['data' => $pasta], 201);
    }

    public function upload(Request $request): JsonResponse
    {
        // Validação da Cota já é feita pelo Middleware CheckStorageQuota
        $validated =$request->validate([
            'arquivo' => 'required|file|max:20480', // 20MB
            'pasta_id' => 'nullable|uuid|exists:ged_pastas,id',
            'entidade_type' => 'nullable|string',
            'entidade_id' => 'nullable|uuid',
        ]);

        $tenantId =$request->user()->tenant_id;
        $arquivo = $request->file('arquivo');$nomeOriginal = $arquivo->getClientOriginalName();$tamanhoBytes = $arquivo->getSize();$caminho = $arquivo->store("ged/{$tenantId}", 'public');

        // MÁGICA AQUI: A variável $arquivo foi injetada no construtor `use` da função anônima
        $doc = DB::transaction(function () use ($validated,$tenantId, $request,$nomeOriginal, $tamanhoBytes,$caminho, $arquivo) {$documento = GedDocumento::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $request->user()->empresa_padrao_id,
                'pasta_id' => $validated['pasta_id'] ?? null,
                'entidade_vinculada_type' => $validated['entidade_type'] ?? null,
                'entidade_vinculada_id' => $validated['entidade_id'] ?? null,
                'nome_original' => $nomeOriginal,
                'caminho_s3' => $caminho,
                'mime_type' => $arquivo->getMimeType(),
                'tamanho_bytes' => $tamanhoBytes,
                'usuario_upload_id' => $request->user()->id,
            ]);

            // Atualiza o uso de armazenamento do plano SaaS do tenant
            Assinatura::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->increment('storage_utilizado_bytes', $tamanhoBytes);

            return $documento;
        });

        return response()->json(['data' => ['message' => 'Arquivo anexado ao cofre com sucesso!', 'documento' => $doc]], 201);
    }
}
