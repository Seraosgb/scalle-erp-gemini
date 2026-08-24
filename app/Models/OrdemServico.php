<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrdemServico extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'os_ordens_servico';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'empresa_id',
        'cliente_id',
        'tecnico_responsavel_id',
        'deposito_saida_id',
        'numero_os',
        'status',
        'prioridade',
        'tipo_manutencao',
        'equipamento_descricao',
        'equipamento_marca_modelo',
        'equipamento_numero_serie',
        'defeito_reclamado',
        'diagnostico_tecnico',
        'servico_executado',
        'data_abertura',
        'prazo_sla_resposta',
        'prazo_sla_resolucao',
        'data_agendamento',
        'data_inicio_execucao',
        'data_conclusao',
        'valor_servicos',
        'valor_pecas',
        'valor_desconto',
        'valor_total',
        'assinatura_cliente_base64',
        'nome_responsavel_recebimento',
        'documento_responsavel_recebimento',
        'assinado_em',
        'hash_assinatura_sha256',
        'ip_assinatura',
        'latitude_assinatura',
        'longitude_assinatura',
    ];

    protected $casts = [
        'data_abertura' => 'datetime',
        'prazo_sla_resposta' => 'datetime',
        'prazo_sla_resolucao' => 'datetime',
        'data_agendamento' => 'datetime',
        'data_inicio_execucao' => 'datetime',
        'data_conclusao' => 'datetime',
        'assinado_em' => 'datetime',
        'valor_servicos' => 'decimal:2',
        'valor_pecas' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'latitude_assinatura' => 'decimal:8',
        'longitude_assinatura' => 'decimal:8',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'cliente_id');
    }

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tecnico_responsavel_id');
    }

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class, 'deposito_saida_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(OrdemServicoItem::class, 'ordem_servico_id');
    }

    public function fotos(): HasMany
    {
        return $this->hasMany(OrdemServicoFoto::class, 'ordem_servico_id');
    }
}