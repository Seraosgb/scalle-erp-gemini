<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Plano;
use App\Services\AsaasGatewayService;
use App\Services\DocumentoService;
use App\Services\TenantProvisioningService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PublicOnboardingController extends Controller
{
    public function listarPlanos(): JsonResponse
    {
        $planos = Plano::where('is_ativo', true)->orderBy('valor_mensal')->get();

        if ($planos->isEmpty()) {
            $defaults = [
                [
                    'id' => (string) Str::uuid(),
                    'nome' => 'MEI / Básico',
                    'slug' => 'mei',
                    'valor_mensal' => 29.90, // Preço Popular Lançamento
                    'limite_usuarios' => 2,
                    'limite_empresas' => 1,
                    'cota_storage_bytes' => 3221225472,
                    'modulos_habilitados' => ['os', 'pdv', 'vendas', 'financeiro', 'pessoas', 'itens'],
                    'is_ativo' => true,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'nome' => 'Plano Pro (PMEs)',
                    'slug' => 'pro',
                    'valor_mensal' => 89.90, // Preço Popular Lançamento
                    'limite_usuarios' => 10,
                    'limite_empresas' => 2,
                    'cota_storage_bytes' => 21474836480,
                    'modulos_habilitados' => ['os', 'pdv', 'vendas', 'compras', 'wms', 'financeiro', 'fiscal', 'frota', 'rh', 'crm', 'ged'],
                    'is_ativo' => true,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'nome' => 'Enterprise B2B',
                    'slug' => 'enterprise',
                    'valor_mensal' => 299.90, // Preço Popular Lançamento
                    'limite_usuarios' => 100,
                    'limite_empresas' => 10,
                    'cota_storage_bytes' => 107374182400,
                    'modulos_habilitados' => ['*'],
                    'is_ativo' => true,
                ],
            ];
            foreach ($defaults as $d) {
                Plano::firstOrCreate(['slug' => $d['slug']], $d);
            }
            $planos = Plano::where('is_ativo', true)->orderBy('valor_mensal')->get();
        }

        return response()->json(['data' => $planos]);
    }

    public function registrarTrial(Request $request, AsaasGatewayService $asaasService): JsonResponse
    {
        $validated = $request->validate([
            'tenant_nome_fantasia' => 'required|string|max:150',
            'tenant_razao_social' => 'required|string|max:200',
            'tenant_documento' => 'required|string|max:20',
            'plano_slug' => 'required|string',
            'admin_name' => 'required|string|max:150',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:6',
            'admin_telefone' => 'nullable|string|max:30',
        ]);

        $docLimpo = preg_replace('/[^0-9]/', '', $validated['tenant_documento']);
        if (!DocumentoService::validarCpfCnpj($docLimpo)) {
            return response()->json(['error' => ['message' => 'O CPF ou CNPJ informado é matematicamente inválido.']], 422);
        }

        if (\App\Models\Tenant::where('documento', $docLimpo)->exists()) {
            return response()->json(['error' => ['message' => 'Este CPF/CNPJ já possui uma conta registrada no Scalle ERP.']], 422);
        }

        $validated['tenant_documento'] = $docLimpo;

        try {
            $ecossistema = TenantProvisioningService::provisionar($validated);

            /** @var Assinatura $assinatura */
            $assinatura = $ecossistema['assinatura'];
            $assinatura->update([
                'status' => 'TRIAL',
                'data_proximo_vencimento' => now()->addDays(14)->toDateString(),
            ]);

            // Integração Assíncrona/Resiliente com o Asaas para agendar cobrança pós-trial (2 semanas)
            if (!empty(env('ASAAS_API_KEY'))) {
                try {
                    $customerId = $asaasService->criarOuAtualizarCliente($ecossistema['tenant']);
                    $asaasService->criarAssinatura($customerId, $assinatura->plano, 2);
                } catch (Exception $exAsaas) {
                    Log::warning("Aviso Asaas Onboarding: " . $exAsaas->getMessage());
                }
            }

            $user = $ecossistema['admin_user'];
            $token = $user->createToken('scalle_onboarding_token')->plainTextToken;

            return response()->json([
                'data' => [
                    'message' => 'Conta empresarial criada com 14 dias de Teste Grátis liberados!',
                    'token' => $token,
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'tenant_id' => $user->tenant_id,
                        'perfil' => 'Administrador',
                        'is_admin' => true,
                        'plano_slug' => $assinatura->plano->slug,
                        'modulos_habilitados' => $assinatura->plano->modulos_habilitados,
                    ]
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'ONBOARDING_FAILED',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }
}
