sempre trazer estes procedimentos para sincronizar os assets em ambas as rotas (`/` e `/app/`) atualizar o commit de acordo com o contexto:

**1. Recompilar o Frontend Localmente**

No terminal PowerShell do VS Code:

PowerShell
    cd C:\Projetos\scalle-erp-gemini\frontend
    npm run build

    cd C:\Projetos\scalle-erp-gemini
    Remove-Item "public\dist.zip" -Force -ErrorAction SilentlyContinue
    Compress-Archive -Path "frontend\dist\*" -DestinationPath "public\dist.zip" -Force

**2. Versionamento Git**

PowerShell
    cd C:\Projetos\scalle-erp-gemini
    git status
    git add -f public/dist.zip
    git commit -m "*atualizar esta parte de acordo com o contexto*"
    git push origin main

**3. Deploy e Sincronização no Servidor Hostoo**

No terminal SSH da Hostoo:

Bash
    cd /home/vtfsiqb3/public_html/scalle-erp-gemini
    git reset --hard HEAD
    git pull origin main

    # 1. Limpar diretórios legados de assets
    rm -rf public/assets public/app/assets

    # 2. Criar as pastas e descompactar
    mkdir -p public/app
    unzip -o public/dist.zip -d public/
    unzip -o public/dist.zip -d public/app/

    # 3. Garantir cópia física dos assets tanto na raiz quanto dentro de /app
    cp -rf public/app/assets public/ 2>/dev/null || true
    cp -rf public/assets public/app/ 2>/dev/null || true

    # 4. Ajustar permissões de leitura
    chmod -R 755 public/assets
    chmod -R 755 public/app
    rm -f public/dist.zip

    # 5. Limpar caches
    killall -9 lsphp 2>/dev/null || true
    php artisan route:clear
    php artisan optimize:clear
    php artisan optimize
