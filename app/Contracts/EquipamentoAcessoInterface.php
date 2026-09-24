<?php

namespace App\Contracts;

interface EquipamentoAcessoInterface
{
    public function liberarAcesso(string $ipEquipamento, string $idPessoa): bool;
    public function bloquearAcesso(string $ipEquipamento, string $idPessoa): bool;
}
