<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GedDocumento;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class GedController extends Controller
{
    /**
     * Processa o upload blindando fisicamente o arquivo na pasta do Tenant.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo' => 'required|file|max:20480', // Limite de 20MB
            'pasta_id' => 'nullable|uuid|exists:ged_pastas,id',
            'entidade_type' => 'nullable|string', // Ex: App\Models\Tarefa
            'entidade_id' => 'nullable|uuid'
        ]);

        $tenantId = $request->user()->tenant_id;
        $file = $request->file('arquivo');

        $nomeOriginal = $file->getClientOriginalName();
        $extensao = $file->getClientOriginalExtension();
        $tamanho = $file->getSize();
        $hash = hash_file('sha256', $file->getRealPath());

        // Isolamento físico no disco (ou bucket S3) usando o ID do Inquilino
        $caminhoFisico = $file->storeAs(
            "ged/{$tenantId}/" . date('Y/m'),
            Str::uuid() . '.' . $extensao,
            'public'
        );

        $documento = GedDocumento::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'pasta_id' => $request->pasta_id,
            'usuario_id' => $request->user()->id,
            'nome_original' => $nomeOriginal,
            'caminho_s3' => $caminhoFisico,
            'extensao' => $extensao,
            'tamanho_bytes' => $tamanho,
            'hash_arquivo' => $hash,
            'entidade_vinculada_type' => $request->entidade_type,
            'entidade_vinculada_id' => $request->entidade_id,
        ]);

        return response()->json(['data' => $documento], 201);
    }
}
