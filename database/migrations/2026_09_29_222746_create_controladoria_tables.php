public function up(): void
    {
        if (!Schema::hasTable('fin_planos_contas')) {
            Schema::create('fin_planos_contas', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->nullable()->index();
                $table->uuid('parent_id')->nullable();
                $table->string('codigo', 50);
                $table->string('nome', 150);
                $table->string('tipo', 20)->nullable();
                $table->boolean('is_sintetico')->default(false);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('parent_id')->references('id')->on('fin_planos_contas')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('fin_centros_custos')) {
            Schema::create('fin_centros_custos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('empresa_id')->nullable()->index();
                $table->uuid('parent_id')->nullable();
                $table->string('codigo', 50);
                $table->string('nome', 150);
                $table->boolean('is_sintetico')->default(false);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('parent_id')->references('id')->on('fin_centros_custos')->onDelete('cascade');
            });
        }
    }
