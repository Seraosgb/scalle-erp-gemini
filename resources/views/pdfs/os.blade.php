<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Laudo Técnico - OS #{{ $os->numero_os }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
        .header { width: 100%; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px; }
        .header table { width: 100%; }
        .empresa-nome { font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
        .empresa-dados { font-size: 10px; color: #64748b; }
        .os-titulo { text-align: right; }
        .os-numero { font-size: 20px; font-weight: bold; color: #4f46e5; }
        .os-data { font-size: 11px; color: #64748b; margin-top: 5px; }
        .badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; font-size: 10px; font-weight: bold; border-radius: 4px; margin-top: 5px; text-transform: uppercase;}
        .section { margin-bottom: 20px; page-break-inside: avoid; }
        .section-title { font-size: 10px; font-weight: bold; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 5px; margin-bottom: 10px; text-transform: uppercase; color: #0f172a; }
        .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-grid td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; width: 50%; }
        .label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 3px; }
        .value { font-size: 12px; font-weight: bold; color: #0f172a; }
        .text-box { border: 1px solid #e2e8f0; padding: 10px; background-color: #f8fafc; min-height: 40px; margin-bottom: 10px; }
        .log-box { border: 1px solid #e2e8f0; padding: 10px; background-color: #f8fafc; font-family: 'Courier New', Courier, monospace; font-size: 10px; white-space: pre-wrap; margin-bottom: 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        .data-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
        .data-table td { border: 1px solid #e2e8f0; padding: 6px; }
        .data-table .right { text-align: right; }
        .data-table .center { text-align: center; }
        .fotos-container { width: 100%; text-align: center; }
        .foto-box { display: inline-block; width: 30%; margin: 1%; border: 1px solid #cbd5e1; padding: 5px; background: #f8fafc; page-break-inside: avoid; }
        .foto-img { width: 100%; height: 140px; object-fit: cover; }
        .foto-label { font-size: 10px; font-weight: bold; margin-top: 5px; color: #4f46e5; text-transform: uppercase; display: block; }
        .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; width: 100%; page-break-inside: avoid; }
        .footer table { width: 100%; }
        .signature-box { text-align: center; width: 200px; float: right; }
        .signature-img { max-height: 60px; max-width: 180px; margin-bottom: 5px; }
        .signature-line { border-top: 1px solid #0f172a; margin-top: 5px; padding-top: 5px; font-weight: bold; font-size: 11px; }
        .legal-text { font-size: 9px; color: #64748b; line-height: 1.4; width: 60%; float: left; }
    </style>
</head>
<body>

    <div class="header">
        <table>
            <tr>
                <td>
                    <div class="empresa-nome">{{ $os->empresa->nome_fantasia ?? 'SCALLE ENTERPRISE' }}</div>
                    <div class="empresa-dados">{{ $os->empresa->razao_social ?? 'Razão Social Padrão' }}</div>
                    <div class="empresa-dados">CNPJ: {{ $os->empresa->cnpj ?? '00.000.000/0001-91' }}</div>
                </td>
                <td class="os-titulo">
                    <div class="os-numero">LAUDO TÉCNICO OFICIAL - OS #{{ $os->numero_os }}</div>
                    <div class="os-data">Emissão: {{ date('d/m/Y H:i', strtotime($os->data_abertura)) }}</div>
                    <div class="badge">{{ $os->tipo_manutencao }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="info-grid">
        <tr>
            <td>
                <span class="label">Dados do Cliente</span>
                <div class="value">{{ $os->cliente->nome_razao_social ?? 'Cliente não informado' }}</div>
                <div style="margin-top: 5px;">Doc: {{ $os->cliente->cpf_cnpj ?? 'N/A' }}</div>
            </td>
            <td>
                <span class="label">Equipamento / Ativo</span>
                <div class="value">{{ $os->equipamento_descricao }}</div>
                <div style="margin-top: 5px;">Marca/Modelo: {{ $os->equipamento_marca_modelo ?? 'N/A' }}</div>
                <div>Série: {{ $os->equipamento_numero_serie ?? 'N/A' }}</div>
            </td>
        </tr>
    </table>

    <div class="section">
        <div class="section-title">Defeito Reclamado pelo Cliente</div>
        <div class="text-box">{{ $os->defeito_reclamado }}</div>
    </div>

    <div class="section">
        <div class="section-title">Diário de Bordo & Diagnóstico de Campo</div>
        <div class="log-box">{{ $os->diagnostico_tecnico ?: 'Nenhum registro técnico detalhado.' }}</div>
    </div>

    <div class="section">
        <div class="section-title">Parecer Final & Serviço Executado</div>
        <div class="text-box">{{ $os->servico_executado ?: 'Execução em conformidade com as normas técnicas.' }}</div>
    </div>

    @if($os->apontamentos && $os->apontamentos->count() > 0)
    <div class="section">
        <div class="section-title">Mão de Obra Aplicada</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Técnico / Responsável</th>
                    <th class="center">Horas</th>
                    <th class="right">Custo/Hora Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($os->apontamentos as $ap)
                <tr>
                    <td>{{ $ap->tecnico->name ?? 'N/A' }}</td>
                    <td class="center">{{ $ap->total_horas }}h</td>
                    <td class="right">R$ {{ number_format($ap->valor_total, 2, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if($os->itens && $os->itens->count() > 0)
    <div class="section">
        <div class="section-title">Materiais e Peças Consumidos</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item do Catálogo</th>
                    <th class="center">Qtd</th>
                    <th class="right">Valor Unit.</th>
                    <th class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($os->itens as $it)
                <tr>
                    <td>{{ $it->item->nome ?? 'Item Genérico/Avulso' }}</td>
                    <td class="center">{{ (float) $it->quantidade }}</td>
                    <td class="right">R$ {{ number_format($it->valor_unitario, 2, ',', '.') }}</td>
                    <td class="right"><strong>R$ {{ number_format($it->valor_total, 2, ',', '.') }}</strong></td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if($os->fotos && $os->fotos->count() > 0)
    <div class="section">
        <div class="section-title">Evidências Fotográficas</div>
        <div class="fotos-container">
            @foreach($os->fotos as $foto)
            <div class="foto-box">
                <img src="{{ $foto->url_arquivo }}" class="foto-img" alt="Foto">
                <span class="foto-label">{{ $foto->tipo_etapa }}</span>
            </div>
            @endforeach
        </div>
    </div>
    @endif

    <div class="footer">
        <div class="legal-text">
            <strong>CONFORMIDADE JURÍDICA MP 2.200-2/2001:</strong><br>
            A assinatura ao lado comprova a execução e aceite dos serviços acima descritos.<br>
            <strong>Hash SHA-256:</strong> {{ $os->hash_assinatura_sha256 ?? 'Aguardando Assinatura' }}<br>
            <strong>IP:</strong> {{ $os->ip_assinatura ?? 'N/A' }} | <strong>Data/Hora:</strong> {{ $os->assinado_em ? date('d/m/Y H:i:s', strtotime($os->assinado_em)) : 'N/A' }}
        </div>

        <div class="signature-box">
            @if($os->assinatura_cliente_base64)
                <img src="{{ $os->assinatura_cliente_base64 }}" class="signature-img" alt="Assinatura">
            @else
                <div style="height: 60px;"></div>
            @endif
            <div class="signature-line">
                {{ $os->nome_responsavel_recebimento ?? ($os->cliente->nome_razao_social ?? 'Recebedor / Cliente') }}<br>
                <span style="font-size: 9px; font-weight: normal;">Aceite do Cliente</span>
            </div>
        </div>
        <div style="clear: both;"></div>
    </div>

</body>
</html>
