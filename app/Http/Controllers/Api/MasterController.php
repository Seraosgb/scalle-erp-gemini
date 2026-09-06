<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;
use App\Models\Plano;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;


class MasterController extends Controller
{
    public function metricas(): JsonResponse
    {
        $totalTenants = Tenant::count();
        $totalUsuarios = User::withoutGlobalScopes()->where('is_master', false)->count();
        $tenantsAtivos = Tenant::where('status', 'ativo')->count();
        $totalAssinaturas = Assinatura::withoutGlobalScopes()->where('status', 'ATIVO')->count();

        return response()->json([
            'data' => [
                'total_tenants' => $totalTenants,
                'total_usuarios' => $totalUsuarios,
                'tenants_ativos' => $tenantsAtivos,
                'total_assinaturas' => $totalAssinaturas,
            ]
        ]);
    }

    public function tenants(Request $request): JsonResponse
    {
        $query = Tenant::withoutGlobalScopes()->with([
            'empresas' => fn($q) => $q->withoutGlobalScopes(),
            'users' => fn($q) => $q->withoutGlobalScopes(),
            'assinaturas.plano' => fn($q) => $q->withoutGlobalScopes()
        ]);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('nome_fantasia', 'ILIKE', "%{$search}%")
                  ->orWhere('razao_social', 'ILIKE', "%{$search}%")
                  ->orWhere('documento', 'ILIKE', "%{$search}%");
            });
        }

        $tenants = $query->orderByDesc('created_at')->paginate(15);
        $planos = Plano::where('is_ativo', true)->get();

        return response()->json([
            'data' => [
                'tenants' => $tenants,
                'planos' => $planos,
            ]
        ]);
    }

    public function storeTenant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_nome_fantasia' => 'required|string|max:150',
            'tenant_razao_social' => 'required|string|max:200',
            'tenant_documento' => 'required|string|max:20|unique:sis_tenants,documento',
            'plano_slug' => 'required|string|exists:sis_planos,slug',
            'admin_name' => 'required|string|max:150',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:6',
            'admin_telefone' => 'nullable|string|max:30',
        ]);

        try {
            $resultado = TenantProvisioningService::provisionar($validated);

            return response()->json([
                'data' => [
                    'message' => 'Novo Tenant e Superadmin provisionados com sucesso!',
                    'detalhes' => $resultado,
                ]
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'PROVISIONING_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function alterarStatusTenant(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $statusNormalizado = strtolower(trim($validated['status']));

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($id);
        $tenant->update(['status' => $statusNormalizado]);

        $assinatura = Assinatura::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
        if ($assinatura) {
            $statusAssinatura = match ($statusNormalizado) {
                'ativo' => 'ATIVO',
                'suspenso' => 'SUSPENSO',
                'soft_lock', 'soft-lock' => 'SOFT_LOCK',
                'cancelado' => 'CANCELADO',
                default => 'TRIAL',
            };
            $assinatura->update(['status' => $statusAssinatura]);
        }

        return response()->json([
            'data' => [
                'message' => "Status do tenant alterado para {$statusNormalizado}.",
                'tenant' => $tenant,
            ]
        ]);
    }
    public function ultimaAuditoria(): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $arquivos = \Illuminate\Support\Facades\File::glob(storage_path('app/auditorias/*.html'));
        if (empty($arquivos)) {
            return response()->json(['error' => 'Nenhum laudo de auditoria gerado até o momento.'], 404);
        }

        // Pega o laudo mais recente
        rsort($arquivos);
        return response()->file($arquivos[0]);
    }
    public function executarAuditoria(): JsonResponse
    {
        try {
            // Aumenta limites temporários para a suíte de testes
            set_time_limit(120);
            ini_set('memory_limit', '512M');

            $diretorio = storage_path('app/auditorias');
            if (!File::exists($diretorio)) {
                File::makeDirectory($diretorio, 0775, true);
            }

            // Executa o comando isoladamente
            \Illuminate\Support\Facades\Artisan::call('scalle:audit-e2e', ['--export' => 'html']);
            $saidaTexto = \Illuminate\Support\Facades\Artisan::output();

            // Localiza o último arquivo JSON gerado
            $arquivosJson = File::glob("{$diretorio}/*.json");
            $dadosRelatorio = null;

            if (!empty($arquivosJson)) {
                rsort($arquivosJson);
                $conteudo = @file_get_contents($arquivosJson[0]);
                if ($conteudo) {
                    $dadosRelatorio = json_decode($conteudo, true);
                }
            }

            return response()->json([
                'data' => [
                    'message' => 'Auditoria E2E executada com sucesso!',
                    'output_console' => $saidaTexto,
                    'laudo' => $dadosRelatorio,
                ]
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Erro na execução da Auditoria E2E: " . $e->getMessage(), [
                'linha' => $e->getLine(),
                'arquivo' => $e->getFile(),
            ]);

            return response()->json([
                'error' => [
                    'code' => 'AUDIT_EXECUTION_ERROR',
                    'message' => $e->getMessage(),
                    'file' => basename($e->getFile()),
                    'line' => $e->getLine(),
                ]
            ], 500);
        }
    }
}
