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
        $this->app->bind(\App\Interfaces\FiscalDriverInterface::class, function ($app) {
            // Retorna o driver limpo. A controller/service injetará o certificado dinamicamente.
            return new \App\Services\Fiscal\SefazNfeDriver();
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
