<?php

namespace App\Interfaces;

use App\Models\DocumentoFiscal;

interface FiscalDriverInterface
{
    public function emitir(array $dadosEmissao): DocumentoFiscal;
    public function cancelar(string $chaveAcesso, string $justificativa): bool;
    public function consultar(string $chaveAcesso): array;
    public function corrigir(string $chaveAcesso, string $correcao): bool;
}
