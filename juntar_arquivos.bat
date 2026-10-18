@echo off
chcp 65001 >nul
cls

:MENU
echo ===================================================
echo       GERADOR DE CONSOLIDADO - SCALLE ERP
echo ===================================================
echo [1] Gerar Consolidado Completo (Dividido em Partes)
echo [2] Gerar Apenas Controladores (Controllers)
echo [3] Gerar Apenas Modelos e Serviços (Models/Services)
echo [4] Sair
echo ===================================================
set /p "opcao=Escolha uma opcao (1-4): "

if "%opcao%"=="1" goto GERAR_COMPLETO
if "%opcao%"=="2" goto GERAR_CONTROLLERS
if "%opcao%"=="3" goto GERAR_MODELS_SERVICES
if "%opcao%"=="4" exit
goto MENU

:GERAR_COMPLETO
set "FILTRO_MODULO=TODOS"
goto EXECUTAR

:GERAR_CONTROLLERS
set "FILTRO_MODULO=Controllers"
goto EXECUTAR

:GERAR_MODELS_SERVICES
set "FILTRO_MODULO=Models_Services"
goto EXECUTAR

:EXECUTAR
echo.
echo [Iniciando a varredura e fragmentacao inteligente (%FILTRO_MODULO%)...]
echo.

:: Limpa partes antigas
for %%f in ("%~dp0consolidado_Parte_*.txt") do del "%%f"
if exist "%~dp0consolidado_BACKEND.txt" del "%~dp0consolidado_BACKEND.txt"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = '%~dp0'; $modo = '%FILTRO_MODULO%'; $exts = @('.html','.json','.js','.css','.xml','.php','.jsx','.tsx'); $ign = @('\node_modules\','\.git\','\vendor\','\bootstrap\','\dist\','\frontend\','\storage\','\public\'); $forb = @('consolidado','.env','package-lock.json','composer.lock'); $files = Get-ChildItem -Path $root -Recurse -File; $allText = ''; foreach ($f in $files) { $skip = $false; foreach ($i in $ign) { if ($f.FullName.Contains($i)) { $skip = $true; break; } } foreach ($fb in $forb) { if ($f.Name.Contains($fb)) { $skip = $true; break; } } if ($modo -eq 'Controllers' -and -not $f.FullName.Contains('Controllers')) { $skip = $true; } if ($modo -eq 'Models_Services' -and -not ($f.FullName.Contains('Models') -or $f.FullName.Contains('Services'))) { $skip = $true; } if ($skip -eq $false -and $exts -contains $f.Extension) { $nl = [Environment]::NewLine; $header = $nl + $nl + '========================================' + $nl + 'ARQUIVO: ' + $f.FullName + $nl + '========================================' + $nl; $content = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8; $allText += $header + $content; } } $charsPerPart = 130000; $partIndex = 1; for ($i = 0; $i -lt $allText.Length; $i += $charsPerPart) { $len = [Math]::Min($charsPerPart, $allText.Length - $i); $subText = $allText.Substring($i, $len); $partPath = Join-Path $root ('consolidado_Parte_' + $partIndex + '.txt'); Set-Content -LiteralPath $partPath -Value $subText -Encoding UTF8; $partIndex++; }"

echo.
echo ===================================================
echo Processo concluido com sucesso!
echo Os arquivos foram fracionados na pasta do projeto.
echo Voce pode enviar as partes separadamente para o chat.
echo ===================================================
pause
cls
goto MENU