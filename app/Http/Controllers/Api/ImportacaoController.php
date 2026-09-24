<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pessoa;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportacaoController extends Controller
{
    public function importarPessoas(Request $request): JsonResponse
    {
        $request->validate([
            'arquivo_csv' => 'required|file' // Aceita upload genérico, nós validamos o conteúdo
        ]);

        $tenantId = $request->user()->tenant_id;
        $path = $request->file('arquivo_csv')->getRealPath();

        // Lê o arquivo CSV considerando o delimitador ponto e vírgula (padrão do Excel no Brasil)
        $linhas = array_map(function($v) { return str_getcsv($v, ";"); }, file($path));

        // Remove o cabeçalho
        array_shift($linhas);

        $sucesso = 0;
        $erros = 0;

        DB::beginTransaction();
        try {
            foreach ($linhas as $linha) {
                // Se a linha não tiver o mínimo de colunas esperadas, ignora
                if (count($linha) < 2) {
                    continue;
                }

                $nome = trim($linha[0] ?? '');
                $documento = preg_replace('/[^0-9]/', '', $linha[1] ?? '');
                $email = trim($linha[2] ?? '');
                $telefone = trim($linha[3] ?? '');
                $tipoReg = strtoupper(trim($linha[4] ?? 'CLIENTE')); // CLIENTE, FORNECEDOR ou AMBOS

                if (empty($nome) || empty($documento)) {
                    $erros++;
                    continue;
                }

                $tipoPessoa = strlen($documento) > 11 ? 'PJ' : 'PF';

                // Evita duplicidade travando pelo documento dentro do Tenant
                $existe = Pessoa::where('tenant_id', $tenantId)->where('cpf_cnpj', $documento)->exists();
                if ($existe) {
                    $erros++;
                    continue;
                }

                Pessoa::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'tipo_pessoa' => $tipoPessoa,
                    'nome_razao_social' => $nome,
                    'cpf_cnpj' => $documento,
                    'email_principal' => $email,
                    'telefone_principal' => $telefone,
                    'is_cliente' => in_array($tipoReg, ['CLIENTE', 'AMBOS']),
                    'is_fornecedor' => in_array($tipoReg, ['FORNECEDOR', 'AMBOS']),
                    'is_ativo' => true,
                ]);
                $sucesso++;
            }

            DB::commit();

            return response()->json([
                'data' => [
                    'message' => "Importação concluída! {$sucesso} cadastros criados. {$erros} linhas ignoradas (duplicadas ou inválidas)."
                ]
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => [
                    'message' => 'Erro ao processar arquivo CSV. Certifique-se de que ele está separado por ponto e vírgula (;). Detalhes: ' . $e->getMessage()
                ]
            ], 422);
        }
    }
}
