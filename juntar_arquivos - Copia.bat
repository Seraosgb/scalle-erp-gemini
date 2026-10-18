@echo off
chcp 65001 >nul
set "PASTA_SAIDA=%~dp0consolidado_BACKEND.txt"

if exist "%PASTA_SAIDA%" del "%PASTA_SAIDA%"

echo [Iniciando a varredura blindada, livre de bugs de copia e cola...]
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = '%~dp0'; $output = '%PASTA_SAIDA%'; $exts = @('.html','.json','.js','.css','.xml','.php','.jsx','.tsx'); $ign = @('\node_modules\','\.git\','\vendor\','\bootstrap\','\dist\','\frontend\','\storage\','\public\'); $forb = @('consolidado','.env','package-lock.json','composer.lock'); $files = Get-ChildItem -Path $root -Recurse -File; foreach ($f in $files) { $skip = $false; foreach ($i in $ign) { if ($f.FullName.Contains($i)) { $skip = $true; break; } } foreach ($fb in $forb) { if ($f.Name.Contains($fb)) { $skip = $true; break; } } if ($skip -eq $false -and $exts -contains $f.Extension -and $f.FullName -ne $output) { $nl = [Environment]::NewLine; $header = $nl + $nl + '========================================' + $nl + 'ARQUIVO: ' + $f.FullName + $nl + '========================================' + $nl; Add-Content -LiteralPath $output -Value $header -Encoding UTF8; $content = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8; Add-Content -LiteralPath $output -Value $content -Encoding UTF8; } }"

echo.
echo Processo concluido com sucesso! O arquivo limpo foi gerado em: %PASTA_SAIDA%
pause