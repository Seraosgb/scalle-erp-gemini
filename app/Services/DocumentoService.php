<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class DocumentoService
{
    /**
     * Validação matemática pura de CPF e CNPJ
     */
    public static function validarCpfCnpj(string $documento): bool
    {
        $doc = preg_replace('/[^0-9]/', '', $documento);

        if (strlen($doc) === 11) {
            return self::validarCpf($doc);
        }

        if (strlen($doc) === 14) {
            return self::validarCnpj($doc);
        }

        return false;
    }

    /**
     * Consulta CNPJ na ReceitaWS com Fallback/Timeout
     */
    public static function consultarCnpjReceitaWs(string $cnpj): ?array
    {
        $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpj);

        if (strlen($cnpjLimpo) !== 14 || !self::validarCnpj($cnpjLimpo)) {
            return null; // Nem perde tempo na API se a matemática falhar
        }

        try {
            // Timeout de 5s para não travar o ERP se a ReceitaWS cair
            $response = Http::timeout(5)->get("https://receitaws.com.br/v1/cnpj/{$cnpjLimpo}");

            if ($response->successful() && $response->json('status') !== 'ERROR') {
                return $response->json();
            }
        } catch (\Exception $e) {
            // Log silencioso pode ser adicionado aqui
        }

        return null;
    }

    private static function validarCpf(string $cpf): bool
    {
        if (preg_match('/(\d)\1{10}/', $cpf)) return false;
        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) return false;
        }
        return true;
    }

    private static function validarCnpj(string $cnpj): bool
    {
        if (preg_match('/(\d)\1{13}/', $cnpj)) return false;
        $b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($i = 0, $n = 0; $i < 12; $n += $cnpj[$i] * $b[++$i]);
        if ($cnpj[12] != ((($n %= 11) < 2) ? 0 : 11 - $n)) return false;
        for ($i = 0, $n = 0; $i <= 12; $n += $cnpj[$i] * $b[$i++]);
        if ($cnpj[13] != ((($n %= 11) < 2) ? 0 : 11 - $n)) return false;
        return true;
    }
}
