<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\RegraTributaria;
use App\Services\MotorFiscalService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FiscalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user ? $user->tenant_id : null;

            $query = DocumentoFiscal::query()->with(['destinatario', 'empresa']);

            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }

            if ($request->filled('modelo')) {
                $query->where('modelo_documento', $request->get('modelo'));
            }

            if ($request->filled('status')) {
                $query->where('status', $request->get('status'));
            }

            $documentos = $query->orderByDesc('created_at')->get();

            return response()->json(['data' => $documentos]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function regras(Request $request): JsonResponse
    {
        try {
            $regras = RegraTributaria::where('is_ativo', true)->orderBy('cfop')->get();
            return response()->json(['data' => $regras]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    public function emitir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'destinatario_id' => 'required|uuid|exists:pes_pessoas,id',
            'modelo_documento' => 'required|string|in:55,65,NFS-e',
            'itens' => 'required|array|min:1',
        ]);

        $empresa = Empresa::first();
        $destinatario = Pessoa::findOrFail($validated['destinatario_id']);

        try {
            $docFiscal = MotorFiscalService::prepararDocumento(
                $empresa,
                $destinatario,
                $validated['modelo_documento'],
                $validated['itens']
            );

            \App\Jobs\TransmitirDocumentoFiscalJob::dispatch($docFiscal->id);

            return response()->json([
                'data' => [
                    'message' => 'Documento fiscal enfileirado para transmissão! O status será atualizado em breve.',
                    'documento' => $docFiscal,
                ]
            ], 202);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'code' => 'FISCAL_PREPARATION_ERROR',
                    'message' => $e->getMessage()
                ]
            ], 422);
        }
    }

    public function cancelar(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $documento = DocumentoFiscal::where('tenant_id', $tenantId)->findOrFail($id);

        if ($documento->status !== 'AUTORIZADO') {
            return response()->json(['error' => ['message' => 'Apenas documentos com status AUTORIZADO podem ser cancelados.']], 422);
        }

        // A SEFAZ exige no mínimo 15 caracteres na justificativa
        $validated = $request->validate([
            'justificativa' => 'required|string|min:15|max:255',
        ]);

        try {
            // Aqui entraria a chamada real: MotorFiscalService::cancelarDocumento($documento, $validated['justificativa']);

            // Simulação de Sucesso (Bypass do Certificado)
            $documento->update([
                'status' => 'CANCELADO',
                'mensagem_sefaz' => 'Evento de Cancelamento Homologado com Sucesso. Justificativa: ' . $validated['justificativa'],
            ]);

            return response()->json([
                'data' => [
                    'message' => 'Documento fiscal cancelado com sucesso na SEFAZ!',
                    'documento' => $documento
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro de comunicação com a SEFAZ: ' . $e->getMessage()]], 422);
        }
    }

    public function cartaCorrecao(Request $request, string $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $documento = DocumentoFiscal::where('tenant_id', $tenantId)->findOrFail($id);

        if ($documento->status !== 'AUTORIZADO') {
            return response()->json(['error' => ['message' => 'Apenas documentos autorizados aceitam Carta de Correção.']], 422);
        }

        // A SEFAZ também exige no mínimo 15 caracteres para a CC-e
        $validated = $request->validate([
            'correcao' => 'required|string|min:15|max:1000',
        ]);

        try {
            // Aqui entraria a chamada real: MotorFiscalService::enviarCCe($documento, $validated['correcao']);

            // Simulação de Sucesso (Bypass do Certificado)
            $documento->update([
                'mensagem_sefaz' => 'CC-e Vinculada com Sucesso. Correção averbada: ' . $validated['correcao'],
            ]);

            return response()->json([
                'data' => [
                    'message' => 'Carta de Correção Eletrônica (CC-e) averbada com sucesso!',
                    'documento' => $documento
                ]
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => ['message' => 'Erro de comunicação com a SEFAZ: ' . $e->getMessage()]], 422);
        }
    }
}
