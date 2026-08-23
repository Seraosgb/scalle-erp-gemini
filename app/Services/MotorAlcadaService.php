<?php

namespace App\Services;

use App\Models\AlcadaAprovacao;
use App\Models\User;
use Illuminate\Support\Str;

class MotorAlcadaService
{
    /**
     * Valida se a concessão de desconto comercial requer aprovação de alçada
     */
    public static function validarDesconto(User $solicitante, string $entidade, string $registroId, float $percentualDesconto, float $valorDesconto): array
    {
        // Administradores possuem alçada livre
        if ($solicitante->perfil && $solicitante->perfil->is_admin) {
            return ['requer_aprovacao' => false, 'aprovado_automatico' => true];
        }

        // Regra de Negócio: Descontos comerciais acima de 10% exigem alçada de ADMIN
        if ($percentualDesconto > 10.00) {
            $solicitacao = AlcadaAprovacao::create([
                'id' => (string) Str::uuid(),
                'solicitante_id' => $solicitante->id,
                'tipo_operacao' => 'DESCONTO_VENDA',
                'entidade_origem' => $entidade,
                'registro_origem_id' => $registroId,
                'valor_solicitado' => $valorDesconto,
                'percentual_solicitado' => $percentualDesconto,
                'status' => 'PENDENTE',
                'justificativa_solicitacao' => "Desconto de {$percentualDesconto}% superior ao limite operacional permitido (10%).",
            ]);

            return [
                'requer_aprovacao' => true,
                'aprovado_automatico' => false,
                'solicitacao_id' => $solicitacao->id,
            ];
        }

        return ['requer_aprovacao' => false, 'aprovado_automatico' => true];
    }
}