<?php

namespace App\Services;

class OfxParserService
{
    /**
     * Faz o parse de um arquivo OFX bancário extraindo as transações financeiras.
     */
    public static function parse(string $conteudo): array
    {
        $transacoes = [];

        // Isola tudo que está dentro de blocos <STMTTRN> ... </STMTTRN> (ou até a próxima tag)
        preg_match_all('/<STMTTRN>(.*?)<\/STMTTRN>/is', $conteudo, $matches);

        // Fallback caso o banco exporte um OFX 1.0 rudimentar sem a tag de fechamento </STMTTRN>
        if (empty($matches[1])) {
            preg_match_all('/<STMTTRN>(.*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/is', $conteudo, $matches);
        }

        foreach ($matches[1] as $bloco) {
            $tipoRaw = self::extrairTag($bloco, 'TRNTYPE');
            $dataRaw = self::extrairTag($bloco, 'DTPOSTED');
            $valorRaw = self::extrairTag($bloco, 'TRNAMT');
            $idBanco = self::extrairTag($bloco, 'FITID');
            $descricaoRaw = self::extrairTag($bloco, 'MEMO') ?: self::extrairTag($bloco, 'NAME');

            // Formatação da Data (YYYYMMDD)
            $dataBase = substr($dataRaw, 0, 8);
            $dataFormatada = substr($dataBase, 0, 4) . '-' . substr($dataBase, 4, 2) . '-' . substr($dataBase, 6, 2);

            // Formatação do Valor
            $valor = (float) str_replace(',', '.', $valorRaw);

            // Determinar Natureza
            $natureza = $valor < 0 ? 'PAGAR' : 'RECEBER';

            // Limpeza de encoding para evitar erros em caracteres com acentos (típico de extratos)
            $descricaoLimpa = mb_convert_encoding(trim($descricaoRaw), 'UTF-8', mb_detect_encoding(trim($descricaoRaw), 'UTF-8, ISO-8859-1', true));

            $transacoes[] = [
                'id_transacao_banco' => $idBanco,
                'tipo_ofx' => $tipoRaw,
                'natureza' => $natureza,
                'data' => $dataFormatada,
                'valor' => abs($valor),
                'valor_original' => $valor,
                'descricao' => $descricaoLimpa,
            ];
        }

        // Ordena por data
        usort($transacoes, fn($a, $b) => strtotime($a['data']) <=> strtotime($b['data']));

        return $transacoes;
    }

    private static function extrairTag(string $bloco, string $tag): string
    {
        if (preg_match('/<'.$tag.'>([^<]+)/i', $bloco, $match)) {
            return trim($match[1]);
        }
        return '';
    }
}
