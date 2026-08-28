<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\TituloFinanceiro;
use App\Services\ExportacaoContabilService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportacaoContabilController extends Controller
{
    public function metricas(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $dtInicio = $request->get('data_inicio', now()->startOfMonth()->toDateString());
        $dtFim = $request->get('data_fim', now()->endOfMonth()->toDateString());

        $totalTitulosLiquidados = TituloFinanceiro::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'LIQUIDADO')
            ->whereBetween('data_liquidacao', [$dtInicio, $dtFim])
            ->count();

        $totalDocumentosFiscais = DocumentoFiscal::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'AUTORIZADO')
            ->whereBetween('data_emissao', [$dtInicio, $dtFim])
            ->count();

        $volumeFinanceiro = TituloFinanceiro::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'LIQUIDADO')
            ->whereBetween('data_liquidacao', [$dtInicio, $dtFim])
            ->sum('valor_pago_acumulado') ?? 0.00;

        return response()->json([
            'data' => [
                'total_titulos_liquidados' => (int) $totalTitulosLiquidados,
                'total_documentos_fiscais' => (int) $totalDocumentosFiscais,
                'volume_financeiro' => (float) $volumeFinanceiro,
            ]
        ]);
    }

    public function download(Request $request): StreamedResponse|JsonResponse
    {
        $request->validate([
            'tipo_formato' => 'required|string|in:DOMINIO,SPED_FISCAL,CSV_FINANCEIRO',
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
        ]);

        $tenantId = $request->user()->tenant_id;
        $empresaId = $request->user()->empresa_padrao_id 
                  ?? Empresa::where('tenant_id', $tenantId)->first()?->id;

        $tipo = $request->get('tipo_formato');
        $dtInicio = $request->get('data_inicio');
        $dtFim = $request->get('data_fim');

        try {
            switch ($tipo) {
                case 'DOMINIO':
                    $conteudo = ExportacaoContabilService::gerarDominioSistemas($tenantId, $empresaId, $dtInicio, $dtFim);
                    $nomeArquivo = "dominio_contabil_{$dtInicio}_{$dtFim}.txt";
                    $contentType = 'text/plain';
                    break;

                case 'SPED_FISCAL':
                    $conteudo = ExportacaoContabilService::gerarSpedFiscal($tenantId, $empresaId, $dtInicio, $dtFim);
                    $nomeArquivo = "sped_fiscal_efd_{$dtInicio}_{$dtFim}.txt";
                    $contentType = 'text/plain';
                    break;

                case 'CSV_FINANCEIRO':
                    $conteudo = ExportacaoContabilService::gerarCsvFinanceiro($tenantId, $empresaId, $dtInicio, $dtFim);
                    $nomeArquivo = "financeiro_analitico_{$dtInicio}_{$dtFim}.csv";
                    $contentType = 'text/csv';
                    break;
            }

            return response()->streamDownload(function () use ($conteudo) {
                echo $conteudo;
            }, $nomeArquivo, [
                'Content-Type' => $contentType,
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'EXPORT_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}