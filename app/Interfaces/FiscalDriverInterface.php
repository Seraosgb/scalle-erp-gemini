<?php

namespace App\Interfaces;

use App\Models\DocumentoFiscal;

interface FiscalDriverInterface
{
    /**
     * Configura o driver dinamicamente com o certificado do Tenant atual.
     */
    public function configurar(string $certificadoBinario, string $senha, string $uf, int $tpAmb = 2): self;

    public function emitir(array $dadosEmissao): DocumentoFiscal;
    public function cancelar(string $chaveAcesso, string $justificativa): bool;
    public function consultar(string $chaveAcesso): array;
    public function corrigir(string $chaveAcesso, string $correcao): bool;
}
