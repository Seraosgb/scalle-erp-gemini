<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Holerite - {{ $holerite->competencia }}</title>
    <style>
        @page { margin: 30px; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #111; line-height: 1.3; }
        .container { width: 100%; border: 1px solid #000; }
        .row { width: 100%; clear: both; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border-right: 1px solid #000; border-bottom: 1px solid #000; }
        th { background-color: #f3f4f6; font-weight: bold; text-align: left; font-size: 10px; text-transform: uppercase;}
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .no-border-bottom td { border-bottom: none; }
        .no-border-right { border-right: none !important; }
        .totals td { font-weight: bold; background-color: #f9f9f9; }
        .box-title { font-size: 9px; color: #555; text-transform: uppercase; margin-bottom: 2px; display: block;}
        .box-value { font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .signature-area { margin-top: 50px; text-align: center; }
        .signature-line { border-top: 1px solid #000; width: 60%; margin: 0 auto; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER DA EMPRESA -->
        <table style="border-bottom: 1px solid #000;">
            <tr>
                <td style="width: 70%; border-right: 1px solid #000; border-bottom: none; padding: 10px;">
                    <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">
                        {{ $holerite->empresa->razao_social ?? 'SCALLE ENTERPRISE' }}
                    </div>
                    <div style="font-size: 10px; color: #444; margin-top: 3px;">
                        CNPJ: {{ $holerite->empresa->cnpj ?? '00.000.000/0001-91' }}
                    </div>
                </td>
                <td class="text-center" style="width: 30%; border-bottom: none; border-right: none; padding: 10px;">
                    <div style="font-size: 14px; font-weight: bold;">RECIBO DE PAGAMENTO</div>
                    <div style="font-size: 12px; margin-top: 5px;">Referência: <strong>{{ $holerite->competencia }}</strong></div>
                </td>
            </tr>
        </table>

        <!-- DADOS DO COLABORADOR -->
        <table style="border-bottom: 1px solid #000;">
            <tr>
                <td style="width: 15%; border-bottom: none;">
                    <span class="box-title">Matrícula</span>
                    <span class="box-value">{{ $holerite->colaborador->matricula ?? '0000' }}</span>
                </td>
                <td style="width: 45%; border-bottom: none;">
                    <span class="box-title">Nome do Colaborador</span>
                    <span class="box-value">{{ $holerite->colaborador->pessoa->nome_razao_social ?? 'N/A' }}</span>
                </td>
                <td style="width: 25%; border-bottom: none;">
                    <span class="box-title">Cargo / Função</span>
                    <span class="box-value">{{ $holerite->colaborador->cargo ?? 'N/A' }}</span>
                </td>
                <td style="width: 15%; border-bottom: none; border-right: none;">
                    <span class="box-title">Admissão</span>
                    <span class="box-value">{{ $holerite->colaborador->data_admissao ? \Carbon\Carbon::parse($holerite->colaborador->data_admissao)->format('d/m/Y') : 'N/A' }}</span>
                </td>
            </tr>
        </table>

        <!-- TABELA DE RUBRICAS -->
        <table>
            <thead>
                <tr>
                    <th style="width: 10%; text-align: center;">Cód.</th>
                    <th style="width: 45%;">Descrição</th>
                    <th style="width: 15%; text-align: center;">Referência</th>
                    <th style="width: 15%; text-align: right;">Vencimentos</th>
                    <th style="width: 15%; text-align: right;" class="no-border-right">Descontos</th>
                </tr>
            </thead>
            <tbody>
                @foreach($holerite->itens as $item)
                <tr class="no-border-bottom">
                    <td class="text-center">{{ str_pad($loop->iteration, 3, '0', STR_PAD_LEFT) }}</td>
                    <td>{{ mb_strtoupper($item->descricao) }}</td>
                    <td class="text-center">{{ $item->referencia ?? '-' }}</td>
                    <td class="text-right">{{ $item->tipo === 'PROVENTO' ? number_format($item->valor, 2, ',', '.') : '' }}</td>
                    <td class="text-right no-border-right">{{ $item->tipo === 'DESCONTO' ? number_format($item->valor, 2, ',', '.') : '' }}</td>
                </tr>
                @endforeach

                <!-- Espaçamento em branco para empurrar os totais para baixo -->
                @for($i = $holerite->itens->count(); $i < 12; $i++)
                <tr class="no-border-bottom">
                    <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="no-border-right">&nbsp;</td>
                </tr>
                @endfor
            </tbody>
        </table>

        <!-- TOTAIS -->
        <table style="border-top: 1px solid #000;">
            <tr class="totals">
                <td style="width: 70%; text-align: right; border-bottom: none;">TOTAIS:</td>
                <td style="width: 15%; text-align: right; border-bottom: none;">{{ number_format($holerite->total_proventos, 2, ',', '.') }}</td>
                <td style="width: 15%; text-align: right; border-bottom: none; border-right: none;">{{ number_format($holerite->total_descontos, 2, ',', '.') }}</td>
            </tr>
        </table>

        <!-- LÍQUIDO -->
        <table style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
            <tr>
                <td style="width: 70%; border-right: 1px solid #000; padding: 10px; border-bottom: none;">
                    <span class="box-title">Observações do Pagamento</span>
                    <span style="font-size: 10px; text-transform: uppercase;">
                        {{ $holerite->observacoes ?? '*** TRANSFERÊNCIA BANCÁRIA / DEPÓSITO EM CONTA ***' }}
                    </span>
                </td>
                <td style="width: 30%; background-color: #f3f4f6; text-align: center; border-bottom: none; border-right: none; padding: 10px;">
                    <span class="box-title" style="margin-bottom: 5px;">Líquido a Receber</span>
                    <span style="font-size: 16px; font-weight: bold;">R$ {{ number_format($holerite->valor_liquido, 2, ',', '.') }}</span>
                </td>
            </tr>
        </table>

        <!-- RODAPÉ DE CÁLCULO (Informativo/Bases) -->
        <table>
            <tr>
                <td style="width: 20%; border-bottom: none;">
                    <span class="box-title">Salário Base</span>
                    <span class="box-value">{{ number_format($holerite->salario_base, 2, ',', '.') }}</span>
                </td>
                <td style="width: 20%; border-bottom: none;">
                    <span class="box-title">Base Cálc. INSS</span>
                    <span class="box-value">{{ number_format($holerite->total_proventos, 2, ',', '.') }}</span>
                </td>
                <td style="width: 20%; border-bottom: none;">
                    <span class="box-title">Base Cálc. FGTS</span>
                    <span class="box-value">{{ number_format($holerite->total_proventos, 2, ',', '.') }}</span>
                </td>
                <td style="width: 20%; border-bottom: none;">
                    <span class="box-title">FGTS do Mês</span>
                    <span class="box-value">{{ number_format($holerite->total_proventos * 0.08, 2, ',', '.') }}</span>
                </td>
                <td style="width: 20%; border-bottom: none; border-right: none;">
                    <span class="box-title">Base Cálc. IRRF</span>
                    <span class="box-value">{{ number_format($holerite->total_proventos, 2, ',', '.') }}</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- ASSINATURA -->
    <div style="margin-top: 30px; text-align: center; font-size: 11px;">
        Declaro ter recebido a importância líquida discriminada neste recibo.<br><br><br><br>
        <div class="signature-line">
            <br>
            Assinatura do Funcionário
        </div>
        <div style="margin-top: 10px;">
            Data: ____/____/________
        </div>
    </div>

    <div style="margin-top: 30px; font-size: 9px; color: #777; text-align: center;">
        Documento gerado eletronicamente por Scalle ERP em {{ now()->format('d/m/Y H:i:s') }}
    </div>
</body>
</html>
