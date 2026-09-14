<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Interfaces\FiscalDriverInterface;
use App\Services\Fiscal\SefazNfeDriver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind do Motor Fiscal - Garantindo Desacoplamento e Injeção de Dependência
        $this->app->bind(FiscalDriverInterface::class, function ($app) {
            // Nota: Por enquanto estamos passando parâmetros dummy.
            // Nas próximas etapas, vamos puxar o CertificadoA1 ativo do Tenant logado diretamente do banco.
            return new SefazNfeDriver('caminho_certificado_dummy.pfx', 'senha_dummy', 'RJ');
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
