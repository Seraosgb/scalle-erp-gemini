@echo off
chcp 65001 >nul
set "PASTA_SAIDA=%~dp0consolidado_DOCUMENTOS_BASE.txt"

if exist "%PASTA_SAIDA%" del "%PASTA_SAIDA%"

echo [Iniciando a varredura blindada...]
echo.

powershell -Command "$root = '%~dp0'; $output = '%PASTA_SAIDA%'; $extensions = @('.md'); $ignoredFolders = '\\node_modules\\|\\.git\\|\\vendor\\|\\bootstrap\\|\\dist\\|\\frontend\\'; $forbiddenFiles = '\.env$'; Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.FullName -notmatch $ignoredFolders -and $_.FullName -notmatch $forbiddenFiles -and $extensions -contains $_.Extension -and $_.FullName -ne $output } | ForEach-Object { Add-Content -Path $output -Value \"`n`n========================================`nARQUIVO: $($_.FullName)`n========================================`n\"; Get-Content -Path $_.FullName -Raw | Add-Content -Path $output }"

echo.
echo Processo concluido! O arquivo foi gerado em: %PASTA_SAIDA%
pause