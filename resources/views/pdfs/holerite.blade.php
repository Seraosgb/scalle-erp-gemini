<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Holerite</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f3f4f6; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Recibo de Pagamento de Salário</h2>
        <p>Competência: <strong>{{ $holerite->competencia }}</strong></p>
    </div>

    <table class="table">
        <tr>
            <td><strong>Colaborador:</strong> {{ $holerite->colaborador->pessoa->nome_razao_social ?? 'N/A' }}</td>
            <td><strong>Matrícula:</strong> {{ $holerite->colaborador->matricula ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td><strong>Cargo:</strong> {{ $holerite->colaborador->cargo ?? 'N/A' }}</td>
            <td><strong>Salário Base:</strong> R$ {{ number_format($holerite->salario_base, 2, ',', '.') }}</td>
        </tr>
    </table>

    <table class="table">
        <thead>
            <tr>
                <th>Descrição / Rubrica</th>
                <th>Referência</th>
                <th class="text-right">Proventos</th>
                <th class="text-right">Descontos</th>
            </tr>
        </thead>
        <tbody>
            @foreach($holerite->itens as $item)
            <tr>
                <td>{{ $item->descricao }}</td>
                <td>{{ $item->referencia }}</td>
                <td class="text-right">{{ $item->tipo === 'PROVENTO' ? 'R$ ' . number_format($item->valor, 2, ',', '.') : '' }}</td>
                <td class="text-right">{{ $item->tipo === 'DESCONTO' ? 'R$ ' . number_format($item->valor, 2, ',', '.') : '' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="table" style="width: 50%; float: right;">
        <tr>
            <td class="bold">Total Proventos:</td>
            <td class="text-right">R$ {{ number_format($holerite->total_proventos, 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bold">Total Descontos:</td>
            <td class="text-right text-red-500">R$ {{ number_format($holerite->total_descontos, 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bold" style="background-color: #f3f4f6;">Líquido a Receber:</td>
            <td class="text-right bold" style="background-color: #f3f4f6;">R$ {{ number_format($holerite->valor_liquido, 2, ',', '.') }}</td>
        </tr>
    </table>
</body>
</html>
