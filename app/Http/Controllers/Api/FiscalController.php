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
            // ... (restante das validações)
        ]);

        $empresa = Empresa::first();
        $destinatario = Pessoa::findOrFail($validated['destinatario_id']);

        try {
            // 1. Apenas monta o documento no banco e deixa como PROCESSANDO (Rápido)
            $docFiscal = MotorFiscalService::prepararDocumento(
                $empresa,
                $destinatario,
                $validated['modelo_documento'],
                $validated['itens']
            );

            // 2. Despacha para o Worker trabalhar em background (Assíncrono)
            \App\Jobs\TransmitirDocumentoFiscalJob::dispatch($docFiscal->id);

            return response()->json([
                'data' => [
                    'message' => 'Documento fiscal enfileirado para transmissão! O status será atualizado em breve.',
                    'documento' => $docFiscal, // Status: PROCESSANDO
                ]
            ], 202); // 202 Accepted (Em processamento)

        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'code' => 'FISCAL_PREPARATION_ERROR',
                    'message' => $e->getMessage()
                ]
            ], 422);
        }
    }
}
