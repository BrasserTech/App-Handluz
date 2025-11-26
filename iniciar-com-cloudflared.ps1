# Script para iniciar o app com Cloudflared (HTTPS valido automaticamente)
# Uso: .\iniciar-com-cloudflared.ps1

Write-Host ""
Write-Host "🚀 Configurando Cloudflared para PWA..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o Cloudflared está instalado
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source

if (-not $cloudflaredPath) {
    Write-Host "Cloudflared nao encontrado no PATH!" -ForegroundColor Yellow
    
    if (Test-Path ".\cloudflared.exe") {
        Write-Host "cloudflared.exe encontrado na pasta do projeto!" -ForegroundColor Green
        $cloudflaredPath = ".\cloudflared.exe"
    } else {
        Write-Host ""
        Write-Host "Para instalar o Cloudflared:" -ForegroundColor Cyan
        Write-Host "   1. Acesse: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
        Write-Host "   2. Baixe cloudflared-windows-amd64.exe" -ForegroundColor White
        Write-Host "   3. Renomeie para cloudflared.exe" -ForegroundColor White
        Write-Host "   4. Coloque em uma pasta no PATH ou na pasta do projeto" -ForegroundColor White
        Write-Host ""
        Write-Host "   Ou use Chocolatey:" -ForegroundColor Cyan
        Write-Host "   choco install cloudflared" -ForegroundColor White
        Write-Host ""
        Write-Host "Cloudflared nao encontrado. Por favor, instale primeiro." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Cloudflared encontrado em: $cloudflaredPath" -ForegroundColor Green
}

Write-Host ""

# Verificar se o build existe
Write-Host "Verificando build..." -ForegroundColor Cyan
if (-not (Test-Path "dist\index.html")) {
    Write-Host "Build nao encontrado. Gerando build..." -ForegroundColor Yellow
    Write-Host ""
    npm run web:build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao gerar build!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}
Write-Host "Build encontrado!" -ForegroundColor Green
Write-Host ""

# Porta do servidor
$PORT = 3000

# Verificar se porta já está em uso (usando Get-NetTCPConnection - mais rápido)
try {
    $existing = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Porta $PORT ja esta em uso!" -ForegroundColor Yellow
        Write-Host "Parando processos na porta $PORT..." -ForegroundColor Yellow
        $processes = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $processes) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
} catch {
    # Ignorar erro
}

# Iniciar servidor em HTTP (Cloudflared fornece HTTPS)
Write-Host "Iniciando servidor Node.js em HTTP (Cloudflared fornece HTTPS)..." -ForegroundColor Gray
$env:FORCE_HTTP = "true"
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server/webServer.js" -PassThru -NoNewWindow -WorkingDirectory $PWD -ErrorAction Stop

# Aguardar servidor iniciar
Write-Host "Aguardando servidor Node.js iniciar (max 10s)..." -ForegroundColor Gray
$serverRunning = $false
for ($i = 0; $i -lt 10; $i++) {
    # Verificar se processo ainda está rodando
    if ($serverProcess.HasExited) {
        Write-Host "ERRO: Processo do servidor encerrou inesperadamente!" -ForegroundColor Red
        exit 1
    }
    
    # Verificar se porta está em uso usando Get-NetTCPConnection (mais rápido e não bloqueia)
    try {
        $portConnection = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
        if ($portConnection) {
            # Porta está em uso - servidor iniciou!
            $serverRunning = $true
            Write-Host "Servidor Node.js detectado na porta $PORT!" -ForegroundColor Green
            
            # Tentar fazer requisição HTTP (opcional, não bloqueia)
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$PORT" -TimeoutSec 1 -ErrorAction SilentlyContinue -UseBasicParsing
                Write-Host "Servidor respondeu ao teste HTTP!" -ForegroundColor Green
            } catch {
                # Ignorar - servidor está rodando mesmo que não responda ao teste
                Write-Host "Servidor rodando (teste HTTP opcional falhou, mas porta esta ativa)" -ForegroundColor Gray
            }
            break
        }
    } catch {
        # Ignorar erros
    }
    
    Start-Sleep -Seconds 1
    if ($i % 3 -eq 0 -and $i -gt 0) {
        Write-Host "Aguardando... ($i/10)" -ForegroundColor Gray
    }
}

# Verificar novamente se processo está rodando (pode ter iniciado mas não respondeu ainda)
if (-not $serverRunning) {
    if ($serverProcess.HasExited) {
        Write-Host "ERRO: Processo do servidor encerrou!" -ForegroundColor Red
        exit 1
    }
    
    # Verificar se porta está em uso e processo está rodando (usando Get-NetTCPConnection - mais rápido)
    $portCheck = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
    $processCheck = Get-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
    
    if ($portCheck -and $processCheck) {
        Write-Host "Servidor detectado (porta $PORT em uso e processo rodando)" -ForegroundColor Green
        Write-Host "Continuando (servidor pode estar processando requisições)..." -ForegroundColor Gray
        $serverRunning = $true
    } else {
        Write-Host "ERRO: Servidor Node.js nao iniciou corretamente!" -ForegroundColor Red
        if (-not $portCheck) {
            Write-Host "   Porta $PORT nao esta em uso" -ForegroundColor Yellow
        }
        if (-not $processCheck) {
            Write-Host "   Processo do servidor nao esta rodando" -ForegroundColor Yellow
        }
        Write-Host "Verifique se ha erros no processo do servidor" -ForegroundColor Yellow
        exit 1
    }
}

if ($serverRunning) {
    Write-Host "Servidor rodando em http://localhost:$PORT" -ForegroundColor Green
} else {
    Write-Host "Servidor iniciado (porta $PORT em uso)" -ForegroundColor Green
}
Write-Host ""

# Parar processos Cloudflared existentes
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Iniciar Cloudflared
Write-Host "Iniciando Cloudflared..." -ForegroundColor Cyan
Write-Host ""

# Criar arquivo de log para capturar URL
$cloudflaredLogFile = Join-Path $PWD "cloudflared.log"
if (Test-Path $cloudflaredLogFile) {
    Remove-Item $cloudflaredLogFile -Force
}

# Cloudflared criara um tunel HTTPS automaticamente
# A URL aparece no stderr, entao redirecionamos ambos
$cloudflaredProcess = Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList "tunnel", "--url", "http://localhost:$PORT" `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput "NUL" `
    -RedirectStandardError $cloudflaredLogFile `
    -ErrorAction Stop

# Aguardar Cloudflared iniciar e obter URL
Write-Host "Aguardando Cloudflared criar tunel HTTPS (max 15s)..." -ForegroundColor Gray
$cloudflaredUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $cloudflaredLogFile) {
        $logContent = Get-Content $cloudflaredLogFile -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-z0-9-]+\.trycloudflare\.com") {
            $cloudflaredUrl = $matches[0]
            break
        }
    }
}

# Tentar obter URL do Cloudflared (ele mostra no console)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TUDO PRONTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($cloudflaredUrl) {
    Write-Host "URL HTTPS (use no celular):" -ForegroundColor Yellow
    Write-Host "   $cloudflaredUrl" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "✅ Certificado SSL valido automaticamente!" -ForegroundColor Green
    Write-Host "✅ PWA funcionara perfeitamente sem avisos!" -ForegroundColor Green
} else {
    Write-Host "Cloudflared esta criando um tunel HTTPS..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   O Cloudflared criara uma URL HTTPS valida automaticamente" -ForegroundColor White
    Write-Host "   A URL aparecera no console acima (formato: https://xxxxx.trycloudflare.com)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Verifique o arquivo cloudflared.log para ver a URL" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Copie a URL que comeca com 'https://' e use no celular!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   O certificado SSL sera valido e o PWA funcionara perfeitamente!" -ForegroundColor Green
}
Write-Host ""
Write-Host "Para parar:" -ForegroundColor Cyan
Write-Host "   Pressione Ctrl+C" -ForegroundColor White
Write-Host ""

# Função para limpar ao sair
function Cleanup {
    Write-Host ""
    Write-Host "Parando servidores..." -ForegroundColor Yellow
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($cloudflaredProcess -and -not $cloudflaredProcess.HasExited) {
        Stop-Process -Id $cloudflaredProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "cloudflared" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Servidores parados!" -ForegroundColor Green
}

Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null

try {
    Write-Host "Pressione Ctrl+C para parar..." -ForegroundColor Gray
    Write-Host ""
    
    # Tentar capturar a URL novamente após alguns segundos (caso não tenha capturado antes)
    if (-not $cloudflaredUrl) {
        Write-Host "Aguardando URL do Cloudflared aparecer..." -ForegroundColor Gray
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 2
            if (Test-Path $cloudflaredLogFile) {
                $logContent = Get-Content $cloudflaredLogFile -Raw -ErrorAction SilentlyContinue
                if ($logContent -match "https://[a-z0-9-]+\.trycloudflare\.com") {
                    $cloudflaredUrl = $matches[0]
                    Write-Host ""
                    Write-Host "URL HTTPS encontrada:" -ForegroundColor Green
                    Write-Host "   $cloudflaredUrl" -ForegroundColor White -BackgroundColor DarkGreen
                    Write-Host ""
                    break
                }
            }
        }
        
        if (-not $cloudflaredUrl) {
            Write-Host ""
            Write-Host "Se a URL nao apareceu, verifique o arquivo cloudflared.log" -ForegroundColor Yellow
            Write-Host "A URL geralmente aparece logo apos iniciar o Cloudflared" -ForegroundColor Yellow
            Write-Host ""
        }
    }
    
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    Cleanup
}

