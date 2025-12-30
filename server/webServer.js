// Servidor simples para servir o build web do app
// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const puppeteer = require('puppeteer');

// Cache simples para posts do Instagram (evitar muitas requisições)
const instagramCache = {
  data: null,
  timestamp: null,
  ttl: 30 * 60 * 1000, // 30 minutos
};

function getCachedPosts() {
  if (instagramCache.data && instagramCache.timestamp && Array.isArray(instagramCache.data) && instagramCache.data.length > 0) {
    const age = Date.now() - instagramCache.timestamp;
    if (age < instagramCache.ttl) {
      console.log(`[Instagram Cache] Retornando ${instagramCache.data.length} posts do cache (idade: ${Math.round(age / 1000)}s)`);
      return instagramCache.data;
    } else {
      console.log(`[Instagram Cache] Cache expirado (idade: ${Math.round(age / 1000)}s)`);
    }
  }
  return null;
}

function setCachedPosts(posts) {
  instagramCache.data = posts;
  instagramCache.timestamp = Date.now();
  console.log(`[Instagram Cache] Posts salvos no cache`);
}

const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, '..', 'dist');

// Ler configuração do Instagram de constants/instagram.ts
function getInstagramMaxPosts() {
  // Ler do arquivo constants/instagram.ts
  try {
    const instagramConfigPath = path.join(__dirname, '..', 'constants', 'instagram.ts');
    if (fs.existsSync(instagramConfigPath)) {
      const content = fs.readFileSync(instagramConfigPath, 'utf8');
      // Extrair maxPosts usando regex (procurar em INSTAGRAM_GRID_CONFIG.maxPosts)
      const match = content.match(/maxPosts:\s*(\d+)/);
      if (match && match[1]) {
        const maxPosts = parseInt(match[1]);
        console.log(`[Config] maxPosts lido de constants/instagram.ts: ${maxPosts}`);
        return maxPosts;
      }
    }
  } catch (err) {
    console.warn(`[Config] Erro ao ler constants/instagram.ts: ${err.message}`);
  }
  
  // Fallback padrão
  console.log(`[Config] Usando valor padrão para maxPosts: 12`);
  return 12;
}

const INSTAGRAM_MAX_POSTS = getInstagramMaxPosts();
console.log(`[Config] Instagram MAX_POSTS configurado: ${INSTAGRAM_MAX_POSTS}`);

// Caminhos dos certificados mkcert (opcional, não necessário com Cloudflared)
const CERT_PATH = path.join(__dirname, '..', 'localhost+2.pem');
const KEY_PATH = path.join(__dirname, '..', 'localhost+2-key.pem');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Garantir Content-Type correto para fontes
  if (ext === '.ttf') {
    return 'font/ttf';
  } else if (ext === '.woff') {
    return 'font/woff';
  } else if (ext === '.woff2') {
    return 'font/woff2';
  } else if (ext === '.otf') {
    return 'font/otf';
  }
  
  return contentType;
}

function serveFile(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
    return;
  }

  const stat = fs.statSync(filePath);
  const contentType = getContentType(filePath);
  
  // Headers base
  const headers = {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000',
  };

  // Headers específicos para manifest.json
  if (filePath.endsWith('manifest.json')) {
    headers['Content-Type'] = 'application/manifest+json';
    headers['Access-Control-Allow-Origin'] = '*';
  }

  // Headers específicos para service-worker.js
  if (filePath.endsWith('service-worker.js')) {
    headers['Content-Type'] = 'application/javascript';
    headers['Service-Worker-Allowed'] = '/';
    headers['Access-Control-Allow-Origin'] = '*';
  }

  // Headers específicos para fontes
  if (filePath.endsWith('.ttf') || filePath.endsWith('.woff') || filePath.endsWith('.woff2') || filePath.endsWith('.otf')) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET';
    headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
    // Garantir que não seja comprimido (pode corromper fontes)
    headers['Content-Encoding'] = 'identity';
  }

  // Se for index.html, injetar variáveis de ambiente do Supabase ANTES de enviar headers
  if (filePath.endsWith('index.html')) {
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Injetar variáveis do Supabase no HTML para o frontend acessar
    const supabaseConfig = {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    };
    
    // Adicionar script antes do fechamento do </head> para disponibilizar as variáveis
    const envScript = `
  <script>
    // Variáveis de ambiente injetadas pelo servidor
    window.__ENV__ = ${JSON.stringify(supabaseConfig)};
  </script>`;
    
    // Injetar antes do </head> ou no início do <body>
    if (html.includes('</head>')) {
      html = html.replace('</head>', envScript + '\n</head>');
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>' + envScript);
    }
    
    // Remover Content-Length do header pois o tamanho mudou
    delete headers['Content-Length'];
    res.writeHead(200, headers);
    res.end(html);
    return;
  }
  
  // Para outros arquivos, enviar headers e arquivo normalmente
  res.writeHead(200, headers);
  
  // Ler arquivo como buffer para garantir integridade
  const fileBuffer = fs.readFileSync(filePath);
  res.end(fileBuffer);
}

// Caminho para arquivo de cookies do Instagram
const INSTAGRAM_COOKIES_PATH = path.join(__dirname, 'instagram-cookies.json');

// Helper function para aguardar (substitui waitForTimeout removido no Puppeteer mais recente)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para obter o caminho do executável do Chromium
function getChromiumExecutablePath() {
  // Se houver variável de ambiente definida, usar ela
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // Tentar caminhos comuns do Chromium no Alpine Linux
  const fs = require('fs');
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  
  for (const chromiumPath of possiblePaths) {
    try {
      if (fs.existsSync(chromiumPath)) {
        // Verificar se é executável
        try {
          fs.accessSync(chromiumPath, fs.constants.X_OK);
          return chromiumPath;
        } catch (e) {
          // Não é executável, tentar próximo
          continue;
        }
      }
    } catch (e) {
      // Erro ao verificar, tentar próximo
      continue;
    }
  }
  
  // Caso contrário, deixar Puppeteer usar o Chromium que ele baixou automaticamente
  return null;
}

// Função para carregar cookies salvos
function loadInstagramCookies() {
  try {
    if (fs.existsSync(INSTAGRAM_COOKIES_PATH)) {
      const cookiesData = fs.readFileSync(INSTAGRAM_COOKIES_PATH, 'utf8');
      const cookies = JSON.parse(cookiesData);
      console.log(`[Instagram Cookies] Cookies carregados: ${cookies.length} cookies`);
      return cookies;
    }
  } catch (err) {
    console.error(`[Instagram Cookies] Erro ao carregar cookies:`, err.message);
  }
  return null;
}

// Função para salvar cookies
function saveInstagramCookies(cookies) {
  try {
    fs.writeFileSync(INSTAGRAM_COOKIES_PATH, JSON.stringify(cookies, null, 2), 'utf8');
    console.log(`[Instagram Cookies] Cookies salvos: ${cookies.length} cookies`);
    return true;
  } catch (err) {
    console.error(`[Instagram Cookies] Erro ao salvar cookies:`, err.message);
    return false;
  }
}

// Função para obter credenciais do Instagram do .env
function getInstagramCredentials() {
  const username = process.env.INSTAGRAM_USERNAME;
  const password = process.env.INSTAGRAM_PASSWORD;
  
  if (username && password) {
    return { username, password };
  }
  
  return null;
}

// Função para fazer login (automático se credenciais disponíveis, senão manual)
async function loginInstagramManually() {
  const credentials = getInstagramCredentials();
  const useHeadless = !!credentials; // Headless se tiver credenciais, mostrar navegador se não
  
  if (credentials) {
    console.log(`[Instagram Puppeteer] Credenciais encontradas no .env - fazendo login automático...`);
  } else {
    console.log(`[Instagram Puppeteer] Nenhuma credencial no .env - modo manual (abrirá navegador)`);
    console.log(`[Instagram Puppeteer] Para login automático, defina INSTAGRAM_USERNAME e INSTAGRAM_PASSWORD no .env`);
  }
  
  // Usar executável do sistema se disponível (Docker/CI)
  const executablePath = getChromiumExecutablePath();
  
  const browser = await puppeteer.launch({
    headless: useHeadless, // Headless se automático, mostrar se manual
    executablePath: executablePath,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Navegar para página de login
    console.log(`[Instagram Puppeteer] Navegando para página de login...`);
    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000); // Aguardar página carregar
    
    if (credentials) {
      // Login automático
      console.log(`[Instagram Puppeteer] Preenchendo credenciais e fazendo login automático...`);
      
      try {
        // Aguardar campos de login aparecerem
        await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        
        // Preencher username
        await page.type('input[name="username"]', credentials.username, { delay: 100 });
        await delay(500);
        
        // Preencher password
        await page.type('input[name="password"]', credentials.password, { delay: 100 });
        await delay(1000);
        
        // Clicar no botão de login
        console.log(`[Instagram Puppeteer] Clicando no botão de login...`);
        
        // Tentar múltiplas formas de encontrar o botão
        const loginButton = await page.$('button[type="submit"]') ||
                           await page.$('button._acan._acap._acas._aj1-._ap30') ||
                           await page.$('button[class*="login"]');
        
        if (loginButton) {
          await loginButton.click();
          console.log(`[Instagram Puppeteer] Botão de login clicado!`);
        } else {
          // Tentar encontrar botão por texto ou outros métodos
          const clicked = await page.evaluate(() => {
            // Tentar botão submit
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
              return true;
            }
            
            // Tentar encontrar por texto
            const buttons = Array.from(document.querySelectorAll('button'));
            const loginBtn = buttons.find(btn => {
              const text = btn.textContent.toLowerCase();
              return (text.includes('log') || text.includes('entrar') || text.includes('sign in')) &&
                     !btn.disabled;
            });
            if (loginBtn) {
              loginBtn.click();
              return true;
            }
            
            // Tentar qualquer botão que não esteja desabilitado e seja visível
            const visibleBtn = buttons.find(btn => {
              const style = window.getComputedStyle(btn);
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     !btn.disabled &&
                     btn.offsetParent !== null;
            });
            if (visibleBtn) {
              visibleBtn.click();
              return true;
            }
            
            return false;
          });
          
          if (clicked) {
            console.log(`[Instagram Puppeteer] Botão de login encontrado e clicado!`);
          } else {
            console.warn(`[Instagram Puppeteer] Não foi possível encontrar botão de login automaticamente`);
          }
        }
        
        // Aguardar navegação após login
        console.log(`[Instagram Puppeteer] Aguardando confirmação de login...`);
        
        // Aguardar possível redirecionamento
        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 })
          ]).catch(() => {
            // Timeout é ok, pode já ter navegado
          });
        } catch (navErr) {
          // Ignorar erros de navegação
        }
        
        await delay(2000);
        
        // Verificar se precisa de verificação de segurança
        const needsVerification = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          return bodyText.includes('confirme') || 
                 bodyText.includes('verificação') ||
                 bodyText.includes('Confirm') ||
                 bodyText.includes('verification') ||
                 window.location.pathname.includes('/challenge') ||
                 window.location.pathname.includes('/accounts/two_factor');
        });
        
        if (needsVerification) {
          console.warn(`[Instagram Puppeteer] ⚠️ Instagram pode estar pedindo verificação de segurança`);
          console.warn(`[Instagram Puppeteer] Se necessário, faça a verificação manualmente`);
          await delay(5000);
        }
      } catch (err) {
        console.error(`[Instagram Puppeteer] Erro durante login automático:`, err.message);
        console.log(`[Instagram Puppeteer] Tentando continuar...`);
      }
    } else {
      // Login manual
      console.log(`[Instagram Puppeteer] Navegador aberto. Faça login no Instagram...`);
      console.log(`[Instagram Puppeteer] Aguardando você fazer login manualmente...`);
    }
    
    // Aguardar login ser concluído (automático ou manual)
    let loggedIn = false;
    let attempts = 0;
    const maxAttempts = credentials ? 60 : 600; // 1 minuto se automático, 10 minutos se manual
    
    console.log(`[Instagram Puppeteer] Iniciando verificação de login (máximo ${maxAttempts} segundos)...`);
    
    while (!loggedIn && attempts < maxAttempts) {
      await delay(1000); // Aguardar 1 segundo
      attempts++;
      
      // Verificar se está logado
      try {
        const currentUrl = page.url();
        const loginCheck = await page.evaluate(() => {
          const cookies = document.cookie;
          const currentPath = window.location.pathname;
          const currentURL = window.location.href;
          
          // Verificar cookies principais do Instagram
          const hasSessionId = cookies.includes('sessionid');
          const hasDsUserId = cookies.includes('ds_user_id');
          const hasMid = cookies.includes('mid=');
          
          // Verificar se não está mais na página de login
          const isNotLoginPage = !currentPath.includes('/accounts/login') &&
                                !currentPath.includes('/accounts/emailsignup');
          
          // Verificar se está na página de reativação (ignorar temporariamente)
          const isReactivationPage = currentURL.includes('#reactivated') ||
                                     currentURL.includes('/reactivated') ||
                                     currentURL.includes('reactivate');
          
          // Verificar elementos da página logada
          const hasNav = document.querySelector('nav') !== null;
          const hasHeader = document.querySelector('header') !== null;
          const hasMain = document.querySelector('main') !== null;
          
          // Verificar URL - se não está em login, provavelmente logou
          const isNotLoginURL = !currentURL.includes('/accounts/login') &&
                               !currentURL.includes('/accounts/emailsignup');
          
          // Verificar se está em página do Instagram (feed, perfil, etc)
          const isInstagramPage = currentPath === '/' || 
                                 currentPath.startsWith('/explore') ||
                                 currentPath.startsWith('/p/') ||
                                 /^\/[a-zA-Z0-9_.]+$/.test(currentPath); // Perfil de usuário
          
          const checks = {
            hasSessionId,
            hasDsUserId,
            hasMid,
            isNotLoginPage,
            isNotLoginURL,
            hasNav,
            hasHeader,
            hasMain,
            isInstagramPage,
            isReactivationPage,
            currentPath,
            cookieLength: cookies.length,
            currentURL: currentURL.substring(0, 100)
          };
          
          // Se estiver na página de reativação, não considerar logado ainda (aguardar processar)
          if (isReactivationPage) {
            return { isLoggedIn: false, checks, isReactivationPage: true };
          }
          
          // Considerar logado se:
          // 1. Tiver ambos cookies essenciais (sessionid E ds_user_id)
          // OU
          // 2. Não estiver na página de login E tiver elementos da página logada E tiver pelo menos um cookie essencial
          // OU
          // 3. Estiver na página de reativação mas já tiver ds_user_id (indica que login foi processado)
          const isLoggedIn = (hasSessionId && hasDsUserId) || 
                           (isNotLoginPage && isNotLoginURL && isInstagramPage && (hasNav || hasHeader) && (hasSessionId || hasDsUserId || cookies.length > 150)) ||
                           (isReactivationPage && hasDsUserId && cookies.length > 100);
          
          return { isLoggedIn, checks, isReactivationPage: isReactivationPage };
        });
        
        // Se estiver na página de reativação, aguardar um pouco mais e continuar verificando
        if (loginCheck.isReactivationPage) {
          if (attempts % 5 === 0) {
            console.log(`[Instagram Puppeteer] ⏳ Página de reativação detectada (#reactivated) - aguardando processar...`);
            console.log(`[Instagram Puppeteer] URL: ${currentUrl}`);
            console.log(`[Instagram Puppeteer] Status:`, JSON.stringify(loginCheck.checks, null, 2));
            
            // Se já tiver ds_user_id, pode considerar logado mesmo na página de reativação
            if (loginCheck.checks.hasDsUserId && loginCheck.checks.cookieLength > 100) {
              console.log(`[Instagram Puppeteer] ✅ Cookies detectados na página de reativação - considerando login bem-sucedido`);
              loggedIn = true;
              break;
            }
            
            // Aguardar um pouco mais para a página processar e navegar
            await delay(2000);
            
            // Tentar navegar para a página inicial para forçar atualização
            try {
              await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
              } catch (e) {
              // Ignorar erros de navegação
            }
          }
          // Continuar loop sem considerar como login completo ainda
        } else if (loginCheck.isLoggedIn) {
          loggedIn = true;
          console.log(`[Instagram Puppeteer] ✅ Login detectado! URL atual: ${currentUrl}`);
          console.log(`[Instagram Puppeteer] Verificações:`, JSON.stringify(loginCheck.checks, null, 2));
          break;
        } else if (attempts % 5 === 0) {
          // Log detalhado a cada 5 segundos para debug
          console.log(`[Instagram Puppeteer] ⏳ Verificando login... (${attempts}/${maxAttempts}s)`);
          console.log(`[Instagram Puppeteer] URL: ${currentUrl}`);
          console.log(`[Instagram Puppeteer] Status:`, JSON.stringify(loginCheck.checks, null, 2));
          
          // Verificar se ainda está na página de login (pode ter dado erro)
          if (currentUrl.includes('/accounts/login')) {
            const errorMsg = await page.evaluate(() => {
              const errorEl = document.querySelector('[role="alert"]') || 
                            document.querySelector('.error') ||
                            document.querySelector('[id*="error"]') ||
                            document.querySelector('[class*="error"]');
              return errorEl ? errorEl.textContent.substring(0, 200) : null;
            });
            
            if (errorMsg) {
              console.warn(`[Instagram Puppeteer] ⚠️ Possível erro no login: ${errorMsg}`);
            }
          }
        }
      } catch (e) {
        // Continuar tentando se houver erro
        if (attempts % 30 === 0) {
          console.log(`[Instagram Puppeteer] Erro ao verificar login:`, e.message);
        }
      }
      
      attempts++;
      if (attempts % 30 === 0 && !credentials) {
        const minutes = Math.floor(attempts / 60);
        const seconds = attempts % 60;
        console.log(`[Instagram Puppeteer] ⏳ Aguardando login... (${minutes}min ${seconds}s)`);
      }
    }
    
    if (!loggedIn) {
      console.error(`[Instagram Puppeteer] ❌ Timeout aguardando login após ${maxAttempts} segundos`);
      console.error(`[Instagram Puppeteer] Verificações finais...`);
      
      try {
        const finalCheck = await page.evaluate(() => {
          return {
            url: window.location.href,
            pathname: window.location.pathname,
            cookies: document.cookie.substring(0, 200),
            hasNav: document.querySelector('nav') !== null,
            title: document.title
          };
        });
        console.log(`[Instagram Puppeteer] Estado final:`, finalCheck);
      } catch (e) {
        console.error(`[Instagram Puppeteer] Erro ao verificar estado final:`, e.message);
      }
      
      console.error(`[Instagram Puppeteer] Por favor, tente novamente. Certifique-se de:`);
      console.error(`[Instagram Puppeteer] 1. Fazer login completamente`);
      console.error(`[Instagram Puppeteer] 2. Aguardar a página inicial carregar`);
      console.error(`[Instagram Puppeteer] 3. Não fechar o navegador antes do login ser detectado`);
      
      await browser.close();
      return null;
    }
    
    // Aguardar um pouco mais para garantir que tudo carregou
    await delay(2000);
    
    // Obter cookies
    const cookies = await page.cookies();
    console.log(`[Instagram Puppeteer] Cookies obtidos: ${cookies.length} cookies`);
    
    // Salvar cookies
    saveInstagramCookies(cookies);
    
    await browser.close();
    console.log(`[Instagram Puppeteer] Login concluído e cookies salvos!`);
    
    return cookies;
  } catch (err) {
    console.error(`[Instagram Puppeteer] Erro durante login:`, err.message);
    await browser.close();
    return null;
  }
}

// Função para garantir que temos cookies válidos
async function ensureInstagramCookies() {
  let cookies = loadInstagramCookies();
  
  if (!cookies || cookies.length === 0) {
    console.log(`[Instagram Puppeteer] ⚠️  Nenhum cookie encontrado!`);
    console.log(`[Instagram Puppeteer] 📝 Para fazer login, acesse: http://localhost:${PORT}/api/instagram/login`);
    console.log(`[Instagram Puppeteer] 🔐 OU aguarde - o sistema tentará abrir o navegador automaticamente...`);
    
    // Tentar fazer login automaticamente (abre navegador)
    cookies = await loginInstagramManually();
    
    if (!cookies) {
      console.error(`[Instagram Puppeteer] ❌ Não foi possível obter cookies. Por favor, acesse /api/instagram/login manualmente.`);
    }
  }
  
  return cookies;
}

// Cache para verificar se já tentamos instalar o Chromium
let chromiumInstallAttempted = false;

// Função para garantir que o Chromium está instalado
async function ensureChromiumInstalled() {
  const fs = require('fs');
  
  try {
    const puppeteer = require('puppeteer');
    let execPath;
    
    try {
      execPath = puppeteer.executablePath();
    } catch (e) {
      console.log(`[Instagram Puppeteer] executablePath() lançou erro:`, e.message);
    }
    
    if (execPath && fs.existsSync(execPath)) {
      console.log(`[Instagram Puppeteer] ✅ Chromium encontrado: ${execPath}`);
      return true;
    }
    
    // Se já tentamos instalar antes e não funcionou, não tentar de novo
    if (chromiumInstallAttempted) {
      console.warn(`[Instagram Puppeteer] ⚠️ Instalação do Chromium já foi tentada anteriormente`);
      return false;
    }
    
    chromiumInstallAttempted = true;
    console.log(`[Instagram Puppeteer] Chromium não encontrado (path: ${execPath || 'null'}), tentando baixar...`);
    
    try {
      // Tentar baixar usando a API do Puppeteer
      const {install, detectBrowserPlatform, Browser} = require('@puppeteer/browsers');
      const platform = detectBrowserPlatform();
      
      if (!platform) {
        console.error(`[Instagram Puppeteer] ❌ Plataforma não detectada`);
        return false;
      }
      
      console.log(`[Instagram Puppeteer] Plataforma detectada: ${platform}`);
      
      // Obter a revisão do Chrome que o Puppeteer espera
      let revision;
      try {
        const revisions = require('puppeteer/lib/cjs/puppeteer/revisions.js');
        revision = revisions.PUPPETEER_REVISIONS?.chrome;
        console.log(`[Instagram Puppeteer] Revisão do Chrome do Puppeteer: ${revision || 'não encontrada'}`);
      } catch (e) {
        revision = '143.0.7499.40'; // Fallback
        console.log(`[Instagram Puppeteer] Usando revisão padrão: ${revision}`);
      }
      
      if (!revision) {
        revision = '143.0.7499.40';
      }
      
      console.log(`[Instagram Puppeteer] Baixando Chromium para ${platform} (revisão: ${revision})...`);
      
      // Criar diretório de cache se não existir
      const cacheDir = '/root/.cache/puppeteer';
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`[Instagram Puppeteer] Diretório de cache criado: ${cacheDir}`);
      }
      
      await install({
        browser: Browser.CHROME,
        platform,
        cacheDir: cacheDir,
        buildId: revision
      });
      
      console.log(`[Instagram Puppeteer] Download concluído, verificando...`);
      
      // Verificar novamente se o Chromium existe
      try {
        const newPath = puppeteer.executablePath();
        if (newPath && fs.existsSync(newPath)) {
          console.log(`[Instagram Puppeteer] ✅ Chromium baixado e verificado: ${newPath}`);
          return true;
        } else {
          console.error(`[Instagram Puppeteer] ❌ Chromium baixado mas não encontrado no caminho esperado: ${newPath}`);
          return false;
        }
      } catch (e) {
        console.error(`[Instagram Puppeteer] ❌ Erro ao verificar Chromium após download:`, e.message);
        return false;
      }
    } catch (installErr) {
      console.error(`[Instagram Puppeteer] ❌ Erro ao baixar Chromium:`, installErr.message);
      console.error(`[Instagram Puppeteer] Stack:`, installErr.stack);
      return false;
    }
  } catch (err) {
    console.error(`[Instagram Puppeteer] ❌ Erro geral ao instalar Chromium:`, err.message);
    console.error(`[Instagram Puppeteer] Stack:`, err.stack);
    return false;
  }
}

// Buscar posts do Instagram usando Puppeteer
async function fetchInstagramPosts(username) {
  console.log(`[Instagram Puppeteer] Iniciando busca de posts para: ${username}`);
  
  try {
    // Garantir que o Chromium está instalado
    const chromiumReady = await ensureChromiumInstalled();
    if (!chromiumReady) {
      return {
        posts: [],
        error: 'Não foi possível instalar/baixar o Chromium. Verifique as dependências do sistema.',
        details: { type: 'chromium_not_available' }
      };
    }
    
    // Garantir que temos cookies
    let cookies = await ensureInstagramCookies();
    
    if (!cookies || cookies.length === 0) {
      return {
        posts: [],
        error: 'Não foi possível obter cookies do Instagram. Login necessário.',
        details: { type: 'no_cookies' }
      };
    }
    
    // Iniciar Puppeteer em modo headless
    // Usar executável do sistema se disponível (Docker/CI)
    const executablePath = getChromiumExecutablePath();
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--disable-web-security' // Pode ajudar com alguns problemas de carregamento
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Definir timeout padrão da página para 60 segundos
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      // Definir cookies
      await page.setCookie(...cookies);
      
      // Navegar para o perfil
      const profileUrl = `https://www.instagram.com/${username}/`;
      console.log(`[Instagram Puppeteer] Navegando para: ${profileUrl}`);
      
      // Usar domcontentloaded em vez de networkidle2 para economizar memória e tempo
      await page.goto(profileUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000 // Aumentado para 60 segundos (Instagram pode demorar para encontrar imagens)
      });
      
      // Aguardar página carregar completamente e scripts executarem
      await delay(5000); // Aumentado para dar mais tempo para o Instagram carregar
      
      // Tentar primeiro via API interna do Instagram (mais confiável quando logado)
      console.log(`[Instagram Puppeteer] Tentando buscar posts via API interna...`);
      
      try {
        const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, {
              credentials: 'include',
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-IG-App-ID': '936619743392459',
              }
            });
            
            if (!res.ok) {
              return { error: `HTTP ${res.status}`, status: res.status };
            }
            
            return await res.json();
          } catch (err) {
            return { error: err.message };
          }
        }, apiUrl);
        
        if (response && !response.error && response.data && response.data.user) {
          const user = response.data.user;
          const mediaEdge = user.edge_owner_to_timeline_media;
          
          if (mediaEdge && mediaEdge.edges && mediaEdge.edges.length > 0) {
            const edges = mediaEdge.edges;
            const extractedPosts = edges.slice(0, INSTAGRAM_MAX_POSTS).map((edge) => {
                const node = edge.node;
                return {
                  id: node.id,
                  shortcode: node.shortcode,
                  imageUrl: node.display_url || node.thumbnail_src,
                caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
                  timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
                  permalink: `https://www.instagram.com/p/${node.shortcode}/`,
                  likes: node.edge_liked_by?.count || 0,
                };
              });
            
            console.log(`[Instagram Puppeteer] Posts encontrados via API: ${extractedPosts.length}`);
            try {
              await browser.close();
            } catch (closeErr) {
              console.warn(`[Instagram Puppeteer] Erro ao fechar browser:`, closeErr.message);
            }
            return extractedPosts;
          } else if (mediaEdge && mediaEdge.count > 0 && (!mediaEdge.edges || mediaEdge.edges.length === 0)) {
            console.log(`[Instagram Puppeteer] API retornou count=${mediaEdge.count} mas edges vazio. Extraindo da página HTML...`);
          }
            } else {
          console.log(`[Instagram Puppeteer] API retornou erro:`, response?.error || 'resposta vazia');
        }
      } catch (apiErr) {
        console.log(`[Instagram Puppeteer] Erro ao buscar via API:`, apiErr.message);
      }
      
      // Fallback: Extrair posts diretamente da página HTML
      console.log(`[Instagram Puppeteer] Extraindo posts da página HTML...`);
      
      const posts = await page.evaluate((maxPosts) => {
        const postElements = [];
        
        // Tentar múltiplas formas de encontrar posts
        // Método 1: Buscar por links de posts (/p/)
        const postLinks = Array.from(document.querySelectorAll('a[href*="/p/"]'));
        const uniqueShortcodes = new Set();
        
        postLinks.forEach(link => {
          const href = link.getAttribute('href');
          const match = href.match(/\/p\/([a-zA-Z0-9_-]{10,})/);
          if (match && match[1] && match[1].length >= 10 && match[1].length <= 12) {
            uniqueShortcodes.add(match[1]);
          }
        });
        
        // Método 2: Buscar em scripts JSON embutidos
        const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent);
            // Buscar recursivamente por shortcodes e dados de posts
            function findPosts(obj, depth = 0) {
              if (depth > 15) return; // Limitar profundidade
              
              if (typeof obj === 'object' && obj !== null) {
                // Se encontrou um objeto com shortcode e outras propriedades de post
                if (obj.shortcode && typeof obj.shortcode === 'string' && obj.shortcode.length >= 10 && obj.shortcode.length <= 12) {
                  const postData = {
                    shortcode: obj.shortcode,
                    imageUrl: obj.display_url || obj.thumbnail_src || null,
                    caption: obj.edge_media_to_caption?.edges?.[0]?.node?.text || '',
                    timestamp: obj.taken_at_timestamp ? new Date(obj.taken_at_timestamp * 1000).toISOString() : null,
                    likes: obj.edge_liked_by?.count || obj.like_count || 0,
                    id: obj.id || obj.shortcode,
                  };
                  
                  // Armazenar dados completos
                  if (!postElements.find(p => p.shortcode === obj.shortcode)) {
                    postElements.push(postData);
                  }
                  uniqueShortcodes.add(obj.shortcode);
                }
                
                if (Array.isArray(obj)) {
                  obj.forEach(item => findPosts(item, depth + 1));
                } else {
                  Object.values(obj).forEach(value => findPosts(value, depth + 1));
                }
              }
            }
            findPosts(data);
          } catch (e) {
            // Ignorar erros de parse
          }
        }
        
        // Se encontrou posts com dados completos, usar eles
        if (postElements.length > 0) {
          return postElements.slice(0, maxPosts).map(post => ({
            id: post.id,
            shortcode: post.shortcode,
            imageUrl: post.imageUrl || `https://www.instagram.com/p/${post.shortcode}/media/?size=l`,
            caption: post.caption || '',
            timestamp: post.timestamp || new Date().toISOString(),
            permalink: `https://www.instagram.com/p/${post.shortcode}/`,
            likes: post.likes || 0,
          }));
        }
        
        // Senão, criar posts básicos a partir dos shortcodes encontrados
        const shortcodeArray = Array.from(uniqueShortcodes).slice(0, maxPosts);
        
        return shortcodeArray.map((shortcode) => {
          // Buscar imagem do post (tentativa de encontrar na página)
          let imageUrl = null;
          
          // Tentar encontrar imagem associada ao post
          const imgElements = Array.from(document.querySelectorAll(`img[src*="${shortcode}"], img[alt*="${shortcode}"]`));
          if (imgElements.length > 0) {
            imageUrl = imgElements[0].src;
          } else {
            // Tentar encontrar imagens nas miniaturas dos posts
            const postLinks = Array.from(document.querySelectorAll(`a[href*="/p/${shortcode}"]`));
            if (postLinks.length > 0) {
              const parent = postLinks[0].closest('article, div');
              if (parent) {
                const img = parent.querySelector('img');
                if (img && img.src) {
                  imageUrl = img.src;
                }
              }
            }
          }
          
          // Se não encontrou, usar URL de fallback (será tratada pelo proxy com redirecionamento)
          return {
            id: shortcode,
            shortcode: shortcode,
            imageUrl: imageUrl || `https://www.instagram.com/p/${shortcode}/media/?size=l`,
            caption: '',
            timestamp: new Date().toISOString(),
            permalink: `https://www.instagram.com/p/${shortcode}/`,
            likes: 0,
          };
        });
      }, INSTAGRAM_MAX_POSTS);
      
      // Fechar browser antes de retornar
      try {
        await browser.close();
      } catch (closeErr) {
        console.warn(`[Instagram Puppeteer] Erro ao fechar browser:`, closeErr.message);
      }
      
      if (posts.length > 0) {
        console.log(`[Instagram Puppeteer] Sucesso: ${posts.length} posts encontrados`);
        return posts;
      } else {
        return {
          posts: [],
          error: 'Nenhum post encontrado no perfil',
          details: { type: 'no_posts_found' }
        };
      }
    } catch (pageErr) {
      // Garantir que o browser seja fechado mesmo em caso de erro
      try {
        await browser.close();
      } catch (closeErr) {
        console.warn(`[Instagram Puppeteer] Erro ao fechar browser após erro:`, closeErr.message);
      }
      throw pageErr;
    }
  } catch (err) {
    console.error(`[Instagram Puppeteer] Erro:`, err.message);
    return { 
      posts: [], 
      error: `Erro ao buscar posts: ${err.message}`,
      details: { type: 'puppeteer_error', message: err.message }
    };
  }
}

// Proxy para imagens do Instagram (resolve problema de CORS)
function proxyImage(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const imageUrl = parsedUrl.query.url;
  
  console.log(`[Image Proxy] Requisição recebida: ${imageUrl ? imageUrl.substring(0, 100) + '...' : 'sem URL'}`);
  
  if (!imageUrl) {
    console.log(`[Image Proxy] Erro: URL não fornecida`);
    if (!res.headersSent) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL da imagem não fornecida' }));
    }
    return;
  }
  
  // Flag para evitar múltiplas respostas
  let responseSent = false;
  
  function sendError(statusCode, message) {
    if (responseSent || res.headersSent) return;
    responseSent = true;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
  
  function sendImage(response) {
    if (responseSent || res.headersSent) return;
    responseSent = true;
    res.writeHead(200, {
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });
    response.pipe(res);
  }
  
  try {
    const urlObj = new URL(imageUrl);
    console.log(`[Image Proxy] Hostname: ${urlObj.hostname}`);
    
    // Verificar se é uma URL do Instagram/Facebook CDN
    if (!urlObj.hostname.includes('instagram') && !urlObj.hostname.includes('fbcdn')) {
      console.log(`[Image Proxy] Erro: URL não permitida (${urlObj.hostname})`);
      sendError(403, 'URL não permitida');
      return;
    }
    
    console.log(`[Image Proxy] Buscando imagem: ${imageUrl.substring(0, 80)}...`);
    
    const makeRequest = (url, followRedirects = true, redirectCount = 0) => {
      if (redirectCount > 5) {
        sendError(500, 'Muitos redirecionamentos');
        return;
      }
      
      const request = https.get(url, {
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000,
    }, (response) => {
      console.log(`[Image Proxy] Resposta recebida: ${response.statusCode} - Content-Type: ${response.headers['content-type']}`);
      
        // Tratar redirecionamentos
        if (followRedirects && (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308)) {
          const location = response.headers.location;
          if (location) {
            console.log(`[Image Proxy] Redirecionamento ${response.statusCode} para: ${location}`);
            // Fazer nova requisição para a URL de destino
            try {
              const redirectUrl = location.startsWith('http') ? location : new URL(location, url).href;
              request.destroy();
              makeRequest(redirectUrl, true, redirectCount + 1);
              return;
            } catch (e) {
              console.error(`[Image Proxy] Erro ao processar redirecionamento:`, e.message);
              sendError(500, 'Erro ao seguir redirecionamento');
        return;
            }
          }
        }
        
        if (response.statusCode === 200) {
          sendImage(response);
        } else {
          console.log(`[Image Proxy] Erro: Status ${response.statusCode}`);
          sendError(response.statusCode, `Erro ao buscar imagem: ${response.statusCode}`);
        }
    });
    
    request.on('error', (err) => {
        if (responseSent) return;
      console.error(`[Image Proxy] Erro na requisição:`, err.message);
        sendError(500, 'Erro ao buscar imagem');
    });
    
    request.on('timeout', () => {
        if (responseSent) return;
      console.error(`[Image Proxy] Timeout ao buscar imagem`);
      request.destroy();
        sendError(504, 'Timeout ao buscar imagem');
    });
    };
    
    makeRequest(imageUrl);
    
  } catch (err) {
    console.error(`[Image Proxy] Erro ao processar URL:`, err.message);
    sendError(400, 'URL inválida');
  }
}

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Log de todas as requisições para debug
  console.log(`[Request] ${req.method} ${pathname} - Host: ${req.headers.host}`);

  // CORS headers para todas as requisições
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      server: 'webServer.js',
      timestamp: new Date().toISOString(),
      port: PORT 
    }));
    return;
  }

  // Endpoint para fazer login manual no Instagram
  if (pathname === '/api/instagram/login') {
    console.log(`[Instagram Login] Endpoint de login manual acessado`);
    
    // Resposta imediata para não bloquear
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Content-Encoding': 'identity'
    });
    res.write(JSON.stringify({ 
      message: 'Iniciando processo de login... Um navegador será aberto. Aguarde.',
      status: 'starting'
    }));
    res.end();
    
    // Executar login em background
    loginInstagramManually().then((cookies) => {
      if (cookies) {
        console.log(`[Instagram Login] Login concluído com sucesso!`);
      } else {
        console.error(`[Instagram Login] Falha ao realizar login`);
      }
    }).catch((err) => {
      console.error(`[Instagram Login] Erro:`, err.message);
    });
    
    return;
  }

  // Endpoint para buscar posts do Instagram
  if (pathname === '/api/instagram/posts') {
    const username = parsedUrl.query.username || 'handluzerna';
    
    // Detectar protocolo e host da requisição
    const protocol = req.headers['x-forwarded-proto'] || (useHTTPS ? 'https' : 'http');
    const host = req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;
    
    console.log(`[Instagram API] Requisição recebida: username=${username}, baseUrl=${baseUrl}`);
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    
    // Verificar cache primeiro
    const cachedPosts = getCachedPosts();
    if (cachedPosts) {
      console.log(`[Instagram API] Retornando ${cachedPosts.length} posts do cache`);
      const postsWithProxy = cachedPosts.map(post => ({
        ...post,
        imageUrl: post.imageUrl 
          ? `${baseUrl}/api/instagram/image?url=${encodeURIComponent(post.imageUrl)}`
          : post.imageUrl
      }));
      res.end(JSON.stringify({ success: true, posts: postsWithProxy, cached: true }));
      
      // Atualizar cache em background (sem bloquear resposta)
      console.log(`[Instagram API] Iniciando atualização de cache em background...`);
      fetchInstagramPosts(username).then((result) => {
        let posts = [];
        if (Array.isArray(result)) {
          posts = result;
        } else if (result && typeof result === 'object') {
          posts = result.posts || [];
        }
        if (posts.length > 0) {
          setCachedPosts(posts);
          console.log(`[Instagram API] Cache atualizado em background com ${posts.length} posts`);
        }
      }).catch((err) => {
        console.error(`[Instagram API] Erro ao atualizar cache em background:`, err.message);
      });
      return;
    }
    
    // Se não houver cache, processar normalmente (com timeout aumentado)
    // O processamento já é assíncrono e não bloqueia outras requisições
    console.log(`[Instagram API] Processando busca de posts (pode demorar até 60 segundos)...`);
    
    fetchInstagramPosts(username).then((result) => {
      // Result sempre será um objeto com posts/error ou array de posts
      let posts = [];
      let error = null;
      let details = {};
      
      if (Array.isArray(result)) {
        posts = result;
      } else if (result && typeof result === 'object') {
        posts = result.posts || [];
        error = result.error || null;
        details = result.details || {};
      }
      
      console.log(`[Instagram API] Posts encontrados: ${posts.length}`);
      
      if (error) {
        console.error(`[Instagram API] Erro: ${error}`);
      }
      
      // Salvar no cache se tiver posts
      if (posts.length > 0) {
        setCachedPosts(posts);
      } else if (error) {
        console.log(`[Instagram API] Nenhum post encontrado devido a erro: ${error}`);
      }
      
      // Substituir URLs das imagens por proxy
      const postsWithProxy = posts.map(post => ({
        ...post,
        imageUrl: post.imageUrl 
          ? `${baseUrl}/api/instagram/image?url=${encodeURIComponent(post.imageUrl)}`
          : post.imageUrl
      }));
      
      res.end(JSON.stringify({ 
        success: posts.length > 0, 
        posts: postsWithProxy, 
        cached: false,
        error: error || null,
        errorDetails: details
      }));
    }).catch((err) => {
      console.error(`[Instagram API] Erro ao buscar posts:`, err);
      res.end(JSON.stringify({ 
        success: false, 
        error: err.message, 
        errorDetails: { type: 'exception', message: err.message },
        posts: [] 
      }));
    });
    
    return;
  }

  // Endpoint para proxy de imagens
  if (pathname === '/api/instagram/image') {
    console.log(`[Instagram Image] Requisição de imagem recebida`);
    proxyImage(req, res);
    return;
  }

  // Remover query string
  pathname = pathname.split('?')[0];

  // Se for rota raiz ou não tiver extensão, servir index.html (SPA routing)
  if (pathname === '/' || !pathname.includes('.')) {
    const indexPath = path.join(DIST_PATH, 'index.html');
    serveFile(req, res, indexPath);
    return;
  }

  // Construir caminho do arquivo
  let filePath = path.join(DIST_PATH, pathname);

  // Verificar se arquivo existe
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(req, res, filePath);
  } else {
    // Se não encontrar, tentar servir index.html (SPA routing)
    const indexPath = path.join(DIST_PATH, 'index.html');
    serveFile(req, res, indexPath);
  }
}

// Criar servidor HTTP ou HTTPS
let server;
let useHTTPS = false;

// Se FORCE_HTTP estiver definido, sempre usar HTTP (útil para Cloudflared)
const forceHTTP = process.env.FORCE_HTTP === 'true' || process.env.FORCE_HTTP === '1';

if (forceHTTP) {
  console.log('🌐 FORCE_HTTP detectado - usando HTTP (Cloudflared fornece HTTPS)');
  server = http.createServer(handleRequest);
} else if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  try {
    const options = {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH)
    };
    server = https.createServer(options, handleRequest);
    useHTTPS = true;
  } catch (error) {
    console.log('⚠️  Erro ao carregar certificados, usando HTTP:', error.message);
    server = http.createServer(handleRequest);
  }
} else if (!forceHTTP) {
  // Tentar encontrar certificados em outros locais comuns
  const possibleCerts = [
    path.join(process.cwd(), 'localhost+2.pem'),
    path.join(process.cwd(), 'localhost+1.pem'),
    path.join(__dirname, 'localhost+2.pem'),
    path.join(__dirname, 'localhost+1.pem'),
  ];
  
  let foundCert = null;
  let foundKey = null;
  
  for (const certPath of possibleCerts) {
    const keyPath = certPath.replace('.pem', '-key.pem');
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      foundCert = certPath;
      foundKey = keyPath;
      break;
    }
  }
  
  if (foundCert && foundKey) {
    try {
      const options = {
        key: fs.readFileSync(foundKey),
        cert: fs.readFileSync(foundCert)
      };
      server = https.createServer(options, handleRequest);
      useHTTPS = true;
      console.log(`✅ Certificados encontrados: ${foundCert}`);
    } catch (error) {
      console.log('⚠️  Erro ao carregar certificados, usando HTTP:', error.message);
      server = http.createServer(handleRequest);
    }
  } else {
    server = http.createServer(handleRequest);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  if (useHTTPS) {
    console.log('🔒 Servidor HTTPS rodando!');
  } else {
    console.log('🚀 Servidor Web rodando!');
  }
  console.log('');
  
  // Descobrir IP local
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'SEU_IP';
  
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'SEU_IP') break;
  }
  
  const protocol = useHTTPS ? 'https' : 'http';
  
  console.log(`📱 Local:    ${protocol}://localhost:${PORT}`);
  console.log(`🌐 Rede:     ${protocol}://${localIP}:${PORT}`);
  console.log('');
  
  if (useHTTPS) {
    console.log('✅ PWA pode ser instalado!');
    console.log('');
    console.log('📝 Para acessar de outros dispositivos:');
    console.log(`   ${protocol}://${localIP}:${PORT}`);
    console.log('');
    console.log('💡 Para instalar o app no celular:');
    console.log(`   1. Acesse ${protocol}://${localIP}:${PORT} no celular`);
    console.log('   2. Menu > "Instalar app" ou "Adicionar à tela inicial"');
    console.log('   3. O app será instalado como PWA! 🎉');
  } else {
    console.log('⚠️  IMPORTANTE: Para PWA funcionar, você precisa de HTTPS!');
    console.log('   Certificados não encontrados. Usando HTTP.');
    console.log('');
    console.log('📝 Para acessar de outros dispositivos:');
    console.log(`   ${protocol}://${localIP}:${PORT}`);
    console.log('');
    console.log('💡 Dica: Use Cloudflared para HTTPS válido (npm run web:cloudflared)');
  }
  console.log('');
});

