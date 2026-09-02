<?php

namespace App\Services;

use App\Models\Assinatura;
use App\Models\Deposito;
use App\Models\Empresa;
use App\Models\Perfil;
use App\Models\Permissao;
use App\Models\Plano;
use App\Models\Tenant;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    public static function provisionar(array $dados): array
    {
        return DB::transaction(function () use ($dados) {
            $tenantId = (string) Str::uuid();

            // 1. Criar Tenant
            $tenant = Tenant::create([
                'id' => $tenantId,
                'nome_fantasia' => $dados['tenant_nome_fantasia'],
                'razao_social' => $dados['tenant_razao_social'],
                'documento' => preg_replace('/[^0-9]/', '', $dados['tenant_documento']),
                'status' => 'ativo',
                'configuracoes' => [
                    'plano_nome' => $dados['plano_slug'] ?? 'pro',
                    'criado_por_master' => true
                ],
            ]);

            // 2. Criar Empresa Matriz
            $empresaId = (string) Str::uuid();
            $empresa = Empresa::create([
                'id' => $empresaId,
                'tenant_id' => $tenantId,
                'nome_fantasia' => $dados['tenant_nome_fantasia'],
                'razao_social' => $dados['tenant_razao_social'],
                'cnpj' => $dados['tenant_documento'],
                'regime_tributario' => $dados['regime_tributario'] ?? 'simples_nacional',
                'is_matriz' => true,
            ]);

            // 3. Criar Perfil Administrador do Tenant (com is_admin = true)
            $perfilAdmin = Perfil::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'nome' => 'Administrador',
                'slug' => 'administrador-' . substr($tenantId, 0, 4),
                'descricao' => 'Acesso total e irrestrito a todas as operações do tenant',
                'is_admin' => true,
                'is_sistema' => true,
            ]);

            // 4. Criar Usuário Superadmin do Tenant
            $superAdmin = User::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_padrao_id' => $empresaId,
                'perfil_id' => $perfilAdmin->id,
                'name' => $dados['admin_name'],
                'email' => $dados['admin_email'],
                'password' => $dados['admin_password'], // Removido o Hash::make()                'telefone' => $dados['admin_telefone'] ?? null,
                'is_ativo' => true,
                'is_master' => false,
            ]);

            // 5. Criar Depósito Central Padrão do WMS
            Deposito::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'empresa_id' => $empresaId,
                'nome' => 'Depósito Central / Matriz',
                'codigo' => 'DEP-01',
                'descricao' => 'Almoxarifado Geral de Operações',
                'is_padrao' => true,
                'is_ativo' => true,
            ]);

            // 6. Vincular Assinatura e Plano
            $plano = Plano::where('slug', $dados['plano_slug'] ?? 'pro')->first()
                  ?? Plano::firstOrCreate(
                      ['slug' => 'pro'],
                      [
                          'id' => (string) Str::uuid(),
                          'nome' => 'Plano Pro (PMEs)',
                          'valor_mensal' => 199.00,
                          'limite_usuarios' => 10,
                          'limite_empresas' => 2,
                          'cota_storage_bytes' => 21474836480, // 20 GB
                          'is_ativo' => true
                      ]
                  );

            $assinatura = Assinatura::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'plano_id' => $plano->id,
                'status' => 'ATIVO',
                'data_inicio' => now()->toDateString(),
                'data_proximo_vencimento' => now()->addDays(30)->toDateString(),
                'storage_utilizado_bytes' => 0,
            ]);

            return [
                'tenant' => $tenant,
                'empresa' => $empresa,
                'admin_user' => $superAdmin,
                'assinatura' => $assinatura->load('plano'),
            ];
        });
    }
}
