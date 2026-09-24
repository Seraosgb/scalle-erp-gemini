<?php

namespace App\Services\Hardware\Adapters;

use App\Contracts\EquipamentoAcessoInterface;
use Illuminate\Support\Facades\Http;
use Exception;

class ControlIdAdapter implements EquipamentoAcessoInterface
{
    public function liberarAcesso(string $ipEquipamento, string $idPessoa): bool
    {
        try {
            // A API oficial da Control iD usa JSON no endpoint execute_actions.fcgi
            $response = Http::timeout(3)->post("http://{$ipEquipamento}/execute_actions.fcgi", [
                'actions' => [
                    ['action' => 'door', 'parameters' => 'door=1'] // Aciona rele 1
                ]
            ]);

            return $response->successful();
        } catch (Exception $e) {
            return false; // Falha silenciosa (catraca offline)
        }
    }

    public function bloquearAcesso(string $ipEquipamento, string $idPessoa): bool
    {
        // Lógica de bloqueio ou deleção de usuário na biometria
        return true;
    }
}
