<?php

namespace App\Services;

class TotpService
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function gerarSecret(int $tamanho = 16): string
    {
        $secret = '';
        for ($i = 0; $i < $tamanho; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, 31)];
        }
        return $secret;
    }

    public static function gerarQrCodeUrl(string $usuarioEmail, string $secret, string $emissor = 'Scalle ERP'): string
    {
        $otpauth = sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($emissor),
            rawurlencode($usuarioEmail),
            $secret,
            rawurlencode($emissor)
        );

        return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . urlencode($otpauth);
    }

    public static function validarCodigo(string $secret, string $codigo, int $janelaTolerancia = 1): bool
    {
        $timeSlice = floor(time() / 30);

        for ($i = -$janelaTolerancia; $i <= $janelaTolerancia; $i++) {
            $codigoCalculado = self::calcularTotp($secret, $timeSlice + $i);
            if (hash_equals($codigoCalculado, str_pad($codigo, 6, '0', STR_PAD_LEFT))) {
                return true;
            }
        }

        return false;
    }

    private static function calcularTotp(string $secret, int $timeSlice): string
    {
        $secretKey = self::base32Decode($secret);
        $timeBytes = pack('N*', 0) . pack('N*', $timeSlice);

        $hmac = hash_hmac('sha1', $timeBytes, $secretKey, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;

        $hashPart = substr($hmac, $offset, 4);
        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32Decode(string $base32): string
    {
        $base32 = strtoupper(trim($base32));
        $buffer = 0;
        $bufferBits = 0;
        $output = '';

        for ($i = 0; $i < strlen($base32); $i++) {
            $char = $base32[$i];
            $val = strpos(self::BASE32_CHARS, $char);
            if ($val === false) continue;

            $buffer = ($buffer << 5) | $val;
            $bufferBits += 5;

            if ($bufferBits >= 8) {
                $bufferBits -= 8;
                $output .= chr(($buffer >> $bufferBits) & 0xFF);
            }
        }

        return $output;
    }
}