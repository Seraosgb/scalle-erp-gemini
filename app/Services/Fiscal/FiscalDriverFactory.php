<?php

namespace App\Services\Fiscal;

use App\Services\Fiscal\Contracts\FiscalDriverInterface;
use Exception;

class FiscalDriverFactory
{
    /**
     * Instancia o Driver correto baseado no modelo do documento fiscal (55=NFe, 65=NFCe, NFS-e)
     */
    public static function make(string $modeloDocumento): FiscalDriverInterface
    {
        return match ($modeloDocumento) {
            //'55' => app(Drivers\NfeDriver::class),
            //'65' => app(Drivers\NfceDriver::class),
            //'NFS-e' => app(Drivers\NfseDriver::class),
            default => throw new Exception("Modelo fiscal {$modeloDocumento} ainda não possui um driver implementado."),
        };
    }
}
