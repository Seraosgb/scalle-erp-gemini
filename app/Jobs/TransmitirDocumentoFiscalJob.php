<?php

namespace App\Jobs;

use App\Models\DocumentoFiscal;
use App\Services\MotorFiscalService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class TransmitirDocumentoFiscalJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $documentoId;

    // Resiliência SEFAZ: Tenta 3 vezes antes de falhar
    public $tries = 3;

    // Espera 10s na primeira falha, 30s na segunda e 60s na terceira
    public $backoff = [10, 30, 60];

    public function __construct(string $documentoId)
    {
        $this->documentoId = $documentoId;
    }

    public function handle(): void
    {
        $documento = DocumentoFiscal::find($this->documentoId);

        if (!$documento || $documento->status !== 'PROCESSANDO') {
            return; // Aborta se não existir ou já tiver sido processado
        }

        try {
            // Aciona o Motor para assinar o XML e enviar para a SEFAZ
            MotorFiscalService::processarTransmissaoSefaz($documento);

            Log::info("NF-e {$documento->id} transmitida com sucesso de forma assíncrona.");

        } catch (Throwable $e) {
            Log::warning("Falha temporária ao transmitir NF-e {$documento->id} - Tentativa: " . $this->attempts());
            throw $e; // O throw faz o Laravel jogar de volta pra fila e respeitar o $backoff
        }
    }

    public function failed(Throwable $exception): void
    {
        // Se esgotar as 3 tentativas, marca como Falha Técnica para o usuário poder reenviar
        $documento = DocumentoFiscal::find($this->documentoId);
        if ($documento) {
            $documento->update([
                'status' => 'FALHA_COMUNICACAO',
                'mensagem_sefaz' => 'Falha após múltiplas tentativas: ' . $exception->getMessage()
            ]);
        }
    }
}
