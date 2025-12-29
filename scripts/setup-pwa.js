// Script para configurar PWA (manifest.json e service worker)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const manifestPath = path.join(distPath, 'manifest.json');
const swPath = path.join(distPath, 'service-worker.js');

if (!fs.existsSync(indexPath)) {
  console.log('⚠️  index.html não encontrado em dist/');
  process.exit(1);
}

// Ler app.json para pegar configurações
const appJsonPath = path.join(__dirname, '..', 'app.json');
let appConfig = {};
if (fs.existsSync(appJsonPath)) {
  appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo;
}

const webConfig = appConfig.web || {};

// Encontrar e copiar ícone
function findIcon() {
  // Primeiro, tentar encontrar na pasta dist
  const distIconPath = path.join(distPath, 'icon.png');
  if (fs.existsSync(distIconPath)) {
    return '/icon.png';
  }
  
  // Tentar encontrar na pasta assets do projeto
  const sourceIconPaths = [
    path.join(__dirname, '..', 'assets', 'images', 'icon.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
  ];
  
  for (const sourceIconPath of sourceIconPaths) {
    if (fs.existsSync(sourceIconPath)) {
      // Copiar para dist
      fs.copyFileSync(sourceIconPath, distIconPath);
      console.log(`📋 Ícone copiado de ${sourceIconPath} para dist/`);
      return '/icon.png';
    }
  }
  
  // Tentar encontrar qualquer ícone PNG na pasta dist
  try {
    const result = execSync(
      `powershell -Command "Get-ChildItem '${distPath}' -Recurse -Filter '*.png' | Select-Object -First 1 -ExpandProperty FullName"`,
      { encoding: 'utf8', cwd: distPath }
    ).trim();
    
    if (result) {
      const relativePath = path.relative(distPath, result).replace(/\\/g, '/');
      return '/' + relativePath;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  // Usar favicon como último recurso
  const faviconPath = path.join(distPath, 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    return '/favicon.ico';
  }
  
  return '/favicon.ico'; // Fallback
}

const iconPath = findIcon();
console.log(`📱 Ícone encontrado: ${iconPath}`);

// Criar manifest.json
const manifest = {
  "name": webConfig.name || "App Handluz",
  "short_name": webConfig.shortName || "Handluz",
  "description": webConfig.description || "App oficial do Handebol de Luzerna",
  "start_url": webConfig.startUrl || "/",
  "scope": webConfig.scope || "/",
  "display": webConfig.display || "standalone",
  "orientation": webConfig.orientation || "portrait",
  "theme_color": webConfig.themeColor || "#1a1a1a",
  "background_color": webConfig.backgroundColor || "#ffffff",
  "lang": webConfig.lang || "pt-BR",
  "dir": webConfig.dir || "ltr",
  "categories": ["sports", "lifestyle"],
  "icons": [
    {
      "src": iconPath,
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": iconPath,
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('✅ manifest.json criado');

// Criar service worker otimizado
// Gerar versão baseada em timestamp para forçar atualização
const cacheVersion = `app-handluz-${Date.now()}`;
const serviceWorker = `// Service Worker otimizado para PWA
// Versão do cache baseada em timestamp para garantir atualizações
const CACHE_VERSION = '${cacheVersion}';
const CACHE_NAME = CACHE_VERSION;
const STATIC_CACHE_NAME = 'app-handluz-static-v1';

// URLs críticas para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Verificar se uma resposta é válida
function isValidResponse(response) {
  if (!response || response.status !== 200) {
    return false;
  }
  
  // Verificar se não é uma resposta de erro HTML
  const contentType = response.headers.get('content-type') || '';
  
  // Se for uma requisição de JS/CSS, garantir que não seja HTML
  if (response.url.match(/\\.(js|css|json)$/)) {
    if (contentType.includes('text/html')) {
      console.warn('⚠️ Resposta inválida: HTML retornado como JS/CSS:', response.url);
      return false;
    }
  }
  
  return true;
}

// Estratégia Network-First: tenta rede primeiro, cache como fallback
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Validar resposta da rede
    if (isValidResponse(networkResponse)) {
      // Clonar resposta para cache (respostas só podem ser lidas uma vez)
      const responseClone = networkResponse.clone();
      
      // Atualizar cache em background
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseClone);
      });
      
      return networkResponse;
    } else {
      // Resposta inválida, tentar cache
      throw new Error('Resposta inválida da rede');
    }
  } catch (error) {
    console.log('🌐 Rede falhou, tentando cache:', request.url);
    
    // Buscar do cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse && isValidResponse(cachedResponse)) {
      return cachedResponse;
    }
    
    // Se cache também falhar, retornar erro
    throw error;
  }
}

// Estratégia Cache-First: tenta cache primeiro, rede como fallback
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse && isValidResponse(cachedResponse)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (isValidResponse(networkResponse)) {
      const responseClone = networkResponse.clone();
      
      // Armazenar em cache estático
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        cache.put(request, responseClone);
      });
      
      return networkResponse;
    }
    
    throw new Error('Resposta inválida');
  } catch (error) {
    console.error('❌ Erro ao buscar recurso:', request.url, error);
    throw error;
  }
}

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache aberto:', CACHE_NAME);
        // Cache apenas URLs críticas, sem bloquear instalação
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('⚠️ Alguns arquivos não puderam ser cacheados:', error);
          // Continuar mesmo se alguns arquivos falharem
        });
      })
      .then(() => {
        console.log('✅ Service Worker instalado');
        // Forçar ativação imediata para aplicar atualizações
        return self.skipWaiting();
      })
  );
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker ativando...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Manter apenas o cache atual e o cache estático
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar controle de todas as páginas imediatamente
      clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker ativado');
      
      // Notificar clientes sobre atualização
      return clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            cacheVersion: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições de extensões do navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Network-First para HTML, JS, CSS e JSON (arquivos que mudam frequentemente)
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.match(/\\.(js|css|json)$/) ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Cache-First para assets estáticos (imagens, fontes, etc)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.pathname.match(/\\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|mp3|mp4|webm)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Network-First como padrão para outros recursos
  event.respondWith(networkFirst(request));
});

// Escutar mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
`;

fs.writeFileSync(swPath, serviceWorker, 'utf8');
console.log('✅ service-worker.js criado');

// Atualizar index.html para incluir manifest e service worker
let html = fs.readFileSync(indexPath, 'utf8');

// Verificar se já tem manifest
if (!html.includes('manifest.json')) {
  // Adicionar manifest antes do fechamento do </head>
  const manifestLink = '  <link rel="manifest" href="/manifest.json">\n';
  html = html.replace('</head>', manifestLink + '</head>');
  console.log('✅ Link do manifest adicionado ao index.html');
}

// Verificar se já tem service worker
if (!html.includes('service-worker')) {
  // Adicionar registro do service worker antes do fechamento do </body>
  const swScript = `  <script>
    (function() {
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker não suportado neste navegador');
        return;
      }

      let registration = null;
      let isUpdating = false;
      let updateCheckInterval = null;

      // Função para registrar Service Worker
      function registerServiceWorker() {
        return navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
          .then((reg) => {
            registration = reg;
            console.log('✅ Service Worker registrado:', reg.scope);
            
            // Verificar se está ativo
            if (reg.active) {
              console.log('✅ Service Worker está ativo');
            }
            
            // Escutar atualizações
            setupUpdateListeners(reg);
            
            // Verificar atualizações periodicamente (a cada 5 minutos)
            updateCheckInterval = setInterval(() => {
              if (reg) {
                reg.update();
              }
            }, 5 * 60 * 1000);
            
            return reg;
          })
          .catch((error) => {
            console.error('❌ Erro ao registrar Service Worker:', error);
          });
      }

      // Configurar listeners para atualizações
      function setupUpdateListeners(reg) {
        // Detectar quando um novo Service Worker está esperando
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (!newWorker) return;
          
          console.log('🔄 Nova versão do Service Worker detectada');
          isUpdating = true;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Há uma nova versão disponível
                console.log('🔄 Nova versão disponível! Atualizando...');
                
                // Notificar o novo worker para pular a espera
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                
                // Aguardar ativação e recarregar
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    console.log('✅ Nova versão ativada! Recarregando página...');
                    // Limpar cache do navegador e recarregar
                    window.location.reload();
                  }
                });
              } else {
                // Primeira instalação
                console.log('✅ Service Worker instalado pela primeira vez');
                isUpdating = false;
              }
            }
          });
        });
        
        // Detectar quando o Service Worker assume controle
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service Worker assumiu controle');
          if (isUpdating) {
            console.log('🔄 Recarregando para aplicar atualização...');
            window.location.reload();
          }
        });
      }

      // Escutar mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log('🔄 Service Worker ativado, versão:', event.data.cacheVersion);
          // Recarregar se necessário
          if (isUpdating) {
            window.location.reload();
          }
        }
      });

      // Registrar imediatamente
      registerServiceWorker();

      // Também registrar quando a página carregar (backup)
      window.addEventListener('load', () => {
        if (!registration) {
          registerServiceWorker();
        } else {
          // Verificar atualizações
          registration.update();
        }
      });

      // Verificar atualizações quando a página ganha foco
      window.addEventListener('focus', () => {
        if (registration) {
          registration.update();
        }
      });

      // Verificar se PWA pode ser instalado
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✅ PWA pode ser instalado!');
        console.log('Evento beforeinstallprompt capturado');
        deferredPrompt = e;
        // NÃO prevenir o comportamento padrão - deixar o navegador mostrar o prompt
      });

      // Verificar se já está instalado
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App já está instalado como PWA!');
      }
      
      // Limpar intervalo ao sair da página
      window.addEventListener('beforeunload', () => {
        if (updateCheckInterval) {
          clearInterval(updateCheckInterval);
        }
      });
    })();
  </script>
`;
  html = html.replace('</body>', swScript + '</body>');
  console.log('✅ Service Worker adicionado ao index.html');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('✅ index.html atualizado');
console.log('');
console.log('🎉 PWA configurado com sucesso!');
console.log('📝 Certifique-se de que o site está em HTTPS para funcionar corretamente.');

