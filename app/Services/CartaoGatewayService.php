<?php

namespace App\Services;

use Exception;

class CartaoGatewayService
{
    /**
     * Processa a transação de cartão de crédito/débito com gateway ou terminal TEF
     */
    public static function processarTransacao(
        float $valor,
        string $modalidade, // CARTAO_CREDITO ou CARTAO_DEBITO
        int $parcelas = 1,
        ?array $dadosCartao = null
    ): array {
        if ($valor <= 0) {
            throw new Exception("O valor da transação deve ser maior que zero.");
        }

        // Mock / Integração Gateway (ex: Asaas, Stone, MercadoPago)
        $nsu = 'NSU' . date('YmdHis') . mt_rand(1000, 9999);
        $autorizacao = strtoupper(substr(md5(uniqid()), 0, 6));

        // Taxa MDR estimada para conciliação bancária
        $taxaMdrPercentual = ($modalidade === 'CARTAO_DEBITO') ? 1.20 : (2.50 + (($parcelas - 1) * 0.80));
        $valorTaxaMdr = round($valor * ($taxaMdrPercentual / 100), 2);
        $valorLiquidoReceber = $valor - $valorTaxaMdr;

        return [
            'sucesso' => true,
            'nsu' => $nsu,
            'codigo_autorizacao' => $autorizacao,
            'bandeira' => $dadosCartao['bandeira'] ?? 'VISA/MASTERCARD',
            'taxa_mdr_percentual' => $taxaMdrPercentual,
            'valor_taxa_mdr' => $valorTaxaMdr,
            'valor_liquido_receber' => $valorLiquidoReceber,
            'mensagem' => 'Transação autorizada com sucesso pela adquirente.',
        ];
    }
}