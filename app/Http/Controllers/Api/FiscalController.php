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
        $query = DocumentoFiscal::with(['destinatario', 'empresa']);

        if ($request->filled('modelo')) {
            $query->where('modelo_documento', $request->get('modelo'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $documentos = $query->orderByDesc('created_at')->paginate(15);

        return response()->json($documentos);
    }

    public function regras(): JsonResponse
    {
        $regras = RegraTributaria::where('is_ativo', true)->orderBy('cfop')->get();
        return response()->json(['data' => $regras]);
    }

    public function emitir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'destinatario_id' => 'required|uuid|exists:pes_pessoas,id',
            'modelo_documento' => 'required|string|in:55,65,NFS-e',
            'itens' => 'required|array|min:1',
            'itens.*.tipo_item' => 'required|string|in:PRODUTO,SERVICO',
            'itens.*.cfop' => 'required|string|max:10',
            'itens.*.valor_total' => 'required|numeric|min:0.01',
        ]);

        $empresa = Empresa::first();
        $destinatario = Pessoa::findOrFail($validated['destinatario_id']);

        try {
            $docFiscal = MotorFiscalService::emitirDocumento(
                $empresa,
                $destinatario,
                $validated['modelo_documento'],
                $validated['itens'],
                'manual'
            );

            return response()->json([
                'data' => [
                    'message' => 'Documento fiscal emitido e autorizado com sucesso!',
                    'documento' => $docFiscal,
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'FISCAL_EMISSION_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }
}