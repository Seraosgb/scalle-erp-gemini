<?php

namespace App\Services;

use App\Models\DocumentoFiscal;
use App\Models\Empresa;
use App\Models\Pessoa;
use App\Models\RegraTributaria;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MotorFiscalService
{
    /**
     * Calcula impostos vigentes e prepara o documento fiscal oficial para transmissão
     */
    public static function emitirDocumento(
        Empresa $empresa,
        Pessoa $destinatario,
        string $modeloDocumento,
        array $itens,
        ?string $origemTipo = null,
        ?string $origemId = null
    ): DocumentoFiscal {
        return DB::transaction(function () use ($empresa, $destinatario, $modeloDocumento, $itens, $origemTipo, $origemId) {
            $totalProdutos = 0.00;
            $totalServicos = 0.00;
            $totalIcms = 0.00;
            $totalPis = 0.00;
            $totalCofins = 0.00;
            $totalIssqn = 0.00;
            $totalIbs = 0.00;
            $totalCbs = 0.00;

            foreach ($itens as $item) {
                $valor = (float) $item['valor_total'];
                $cfop = $item['cfop'] ?? '5102';

                // Busca regra tributária cadastrada
                $regra = RegraTributaria::where('empresa_id', $empresa->id)
                    ->where('cfop', $cfop)
                    ->first();

                if ($item['tipo_item'] === 'SERVICO') {
                    $totalServicos += $valor;
                    $aliqIss = $regra ? (float) $regra->aliquota_issqn : 5.00;
                    $totalIssqn += ($valor * ($aliqIss / 100));
                } else {
                    $totalProdutos += $valor;
                    
                    if ($regra) {
                        $totalIcms += ($valor * ((float) $regra->aliquota_icms / 100));
                        $totalPis += ($valor * ((float) $regra->aliquota_pis / 100));
                        $totalCofins += ($valor * ((float) $regra->aliquota_cofins / 100));
                        // Reforma Tributária
                        $totalIbs += ($valor * ((float) $regra->aliquota_ibs / 100));
                        $totalCbs += ($valor * ((float) $regra->aliquota_cbs / 100));
                    }
                }
            }

            $valorTotalDocumento = $totalProdutos + $totalServicos;

            // Próximo número sequencial para o modelo/série
            $ultimoNumero = DocumentoFiscal::where('empresa_id', $empresa->id)
                ->where('modelo_documento', $modeloDocumento)
                ->max('numero_documento') ?? 0;
            $proximoNumero = $ultimoNumero + 1;

            // Gerar chave de acesso de 44 dígitos (Mock SEFAZ)
            $chaveAcesso = '33' . date('ym') . preg_replace('/[^0-9]/', '', $empresa->cnpj) . $modeloDocumento . '001' . str_pad($proximoNumero, 9, '0', STR_PAD_LEFT) . '1' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT) . '0';

            return DocumentoFiscal::create([
                'id' => (string) Str::uuid(),
                'empresa_id' => $empresa->id,
                'destinatario_id' => $destinatario->id,
                'origem_tipo' => $origemTipo,
                'origem_id' => $origemId,
                'modelo_documento' => $modeloDocumento,
                'serie' => 1,
                'numero_documento' => $proximoNumero,
                'chave_acesso' => $chaveAcesso,
                'ambiente' => 'HOMOLOGACAO',
                'status' => 'AUTORIZADO',
                'protocolo_autorizacao' => '13326' . mt_rand(100000000, 999999999),
                'codigo_status_sefaz' => '100',
                'motivo_status_sefaz' => 'Autorizado o uso da NF-e',
                'valor_total_produtos' => $totalProdutos,
                'valor_total_servicos' => $totalServicos,
                'valor_total_documento' => $valorTotalDocumento,
                'valor_icms' => $totalIcms,
                'valor_pis' => $totalPis,
                'valor_cofins' => $totalCofins,
                'valor_issqn' => $totalIssqn,
                'valor_ibs' => $totalIbs,
                'valor_cbs' => $totalCbs,
                'data_emissao' => now(),
                'data_autorizacao' => now(),
            ]);
        });
    }
}