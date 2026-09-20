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
        $tenantId = $request->user()->tenant_id;
        $pastaId = $request->get('pasta_id');

        $pastas = GedPasta::where('tenant_id', $tenantId)
            ->where('pasta_pai_id', $pastaId)
            ->orderBy('nome')
            ->get();

        $documentos = GedDocumento::where('tenant_id', $tenantId)
            ->where('pasta_id', $pastaId)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get();

        $caminho = [];
        if ($pastaId) {
            $atual = GedPasta::find($pastaId);
            while ($atual) {
                array_unshift($caminho, ['id' => $atual->id, 'nome' => $atual->nome]);
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
        $tenantId = $request->user()->tenant_id;
        $validated = $request->validate([
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
        $validated = $request->validate([
            'arquivo' => 'required|file|max:20480', // 20MB
            'pasta_id' => 'nullable|uuid|exists:ged_pastas,id',
            'entidade_type' => 'nullable|string',
            'entidade_id' => 'nullable|uuid',
        ]);

        $tenantId = $request->user()->tenant_id;
        $userId = $request->user()->id;
        $empresaId = $request->user()->empresa_padrao_id ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $arquivo = $request->file('arquivo');
        $nomeOriginal = $arquivo->getClientOriginalName();
        $tamanhoBytes = $arquivo->getSize();
        $mimeType = $arquivo->getMimeType();
        $extensao = $arquivo->getClientOriginalExtension() ?: 'bin'; // Extrai a extensão e previne nulos
        $caminho = $arquivo->store("ged/{$tenantId}", 'public');

        $doc = DB::transaction(function () use ($validated, $tenantId, $userId, $empresaId, $nomeOriginal, $tamanhoBytes, $caminho, $mimeType, $extensao) {

            $documentoId = (string) Str::uuid();

            // Mapeamento corretivo exaustivo para contornar restrições Not Null da base legada
            DB::table('ged_documentos')->insert([
                'id' => $documentoId,
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'pasta_id' => $validated['pasta_id'] ?? null,
                'entidade_vinculada_type' => $validated['entidade_type'] ?? null,
                'entidade_vinculada_id' => $validated['entidade_id'] ?? null,
                'nome_original' => $nomeOriginal,
                'caminho_s3' => $caminho,
                'mime_type' => $mimeType,
                'tamanho_bytes' => $tamanhoBytes,
                'extensao' => $extensao, // <-- Coluna adicionada para satisfazer a restrição
                'usuario_upload_id' => $userId,
                'usuario_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Assinatura::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->increment('storage_utilizado_bytes', $tamanhoBytes);

            return DB::table('ged_documentos')->where('id', $documentoId)->first();
        });

        return response()->json(['data' => ['message' => 'Arquivo anexado ao cofre com sucesso!', 'documento' => $doc]], 201);
    }
}
