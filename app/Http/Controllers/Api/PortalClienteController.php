<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrdemServico;
use App\Models\TituloFinanceiro;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PortalClienteController extends Controller
{
    public function consultarOs(string $token): JsonResponse
    {
        $os = OrdemServico::withoutGlobalScopes()
            ->with(['cliente', 'empresa', 'itens.item', 'fotos', 'tecnico', 'apontamentos.tecnico', 'ativo'])
            ->where('id', $token)
            ->firstOrFail();

        // Geração do Payload PIX EMV Padrão Banco Central
        $chavePix = $os->empresa->cnpj ?? '00000000000191';
        $nomeEmpresa = strtoupper(substr($os->empresa->nome_fantasia ?? 'SCALLE ERP', 0, 25));
        $cidadeEmpresa = 'BELFORD ROXO';
        $valorTotalFormatado = number_format((float) $os->valor_total, 2, '.', '');
        
        $payloadPix = self::gerarPayloadPix($chavePix, $nomeEmpresa, $cidadeEmpresa, $valorTotalFormatado, "OS{$os->numero_os}");

        return response()->json([
            'data' => [
                'id' => $os->id,
                'numero_os' => $os->numero_os,
                'status' => $os->status,
                'prioridade' => $os->prioridade,
                'tipo_manutencao' => $os->tipo_manutencao,
                'equipamento' => $os->equipamento_descricao,
                'marca_modelo' => $os->equipamento_marca_modelo,
                'numero_serie' => $os->equipamento_numero_serie,
                'defeito_reclamado' => $os->defeito_reclamado,
                'diagnostico_tecnico' => $os->diagnostico_tecnico,
                'servico_executado' => $os->servico_executado,
                'valor_servicos' => (float) $os->valor_servicos,
                'valor_pecas' => (float) $os->valor_pecas,
                'valor_desconto' => (float) $os->valor_desconto,
                'valor_total' => (float) $os->valor_total,
                'nome_responsavel_recebimento' => $os->nome_responsavel_recebimento,
                'documento_responsavel_recebimento' => $os->documento_responsavel_recebimento,
                'assinado_em' => $os->assinado_em,
                'hash_assinatura_sha256' => $os->hash_assinatura_sha256,
                'assinatura_cliente_base64' => $os->assinatura_cliente_base64,
                'data_abertura' => $os->data_abertura,
                'data_conclusao' => $os->data_conclusao,
                'itens' => $os->itens,
                'fotos' => $os->fotos,
                'apontamentos' => $os->apontamentos,
                'ativo' => $os->ativo,
                'empresa' => [
                    'nome' => $os->empresa->nome_fantasia,
                    'razao_social' => $os->empresa->razao_social,
                    'documento' => $os->empresa->cnpj,
                ],
                'pix' => [
                    'chave' => $chavePix,
                    'payload_copia_cola' => $payloadPix,
                    'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' . urlencode($payloadPix),
                ]
            ]
        ]);
    }

    public function aprovarOrcamento(Request $request, string $token): JsonResponse
    {
        $os = OrdemServico::withoutGlobalScopes()->where('id', $token)->firstOrFail();

        if ($os->status === 'CONCLUIDA' || $os->status === 'CANCELADA') {
            return response()->json(['error' => ['message' => 'Esta OS já se encontra finalizada.']], 422);
        }

        $os->update([
            'status' => 'EM_EXECUCAO',
            'observacoes' => ($os->observacoes ? $os->observacoes . ' | ' : '') . 'Orçamento aprovado pelo cliente no Portal em ' . now()->format('d/m/Y H:i'),
        ]);

        return response()->json([
            'data' => [
                'message' => 'Orçamento aprovado com sucesso! A equipe técnica foi notificada para início da execução.',
                'status' => $os->status
            ]
        ]);
    }

    private static function gerarPayloadPix(string $chave, string $nome, string $cidade, string $valor, string $txid): string
    {
        $payload = "00020126" . sprintf("%02d", strlen("0014BR.GOV.BCB.PIX01" . sprintf("%02d", strlen($chave)) . $chave)) . "0014BR.GOV.BCB.PIX01" . sprintf("%02d", strlen($chave)) . $chave;
        $payload .= "52040000530398654" . sprintf("%02d", strlen($valor)) . $valor;
        $payload .= "5802BR59" . sprintf("%02d", strlen($nome)) . $nome;
        $payload .= "60" . sprintf("%02d", strlen($cidade)) . $cidade;
        $payload .= "62" . sprintf("%02d", strlen("05" . sprintf("%02d", strlen($txid)) . $txid)) . "05" . sprintf("%02d", strlen($txid)) . $txid;
        $payload .= "6304";

        // Cálculo do Checksum CRC16-CCITT
        $crc = 0xFFFF;
        for ($i = 0; $i < strlen($payload); $i++) {
            $crc ^= (ord($payload[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }
        return $payload . strtoupper(sprintf('%04X', $crc));
    }
}