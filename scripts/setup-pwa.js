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

// Criar service worker básico
const serviceWorker = `// Service Worker para PWA
const CACHE_NAME = 'app-handluz-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Instalar service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('Erro ao adicionar ao cache:', error);
          // Continuar mesmo se alguns arquivos falharem
        });
      })
  );
  // Forçar ativação imediata
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar controle de todas as páginas imediatamente
  event.waitUntil(clients.claim());
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retornar do cache ou buscar da rede
        return response || fetch(event.request);
      })
  );
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
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
          .then((registration) => {
            console.log('Service Worker registrado:', registration.scope);
            // Verificar atualizações
            registration.update();
          })
          .catch((error) => {
            console.error('Erro ao registrar Service Worker:', error);
          });
      });
      
      // Registrar imediatamente
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope);
          
          // Verificar se está ativo
          if (registration.active) {
            console.log('✅ Service Worker está ativo');
          }
          
          // Verificar atualizações
          registration.update();
          
          // Aguardar um pouco e verificar novamente
          setTimeout(() => {
            registration.update();
            if (registration.active) {
              console.log('✅ Service Worker confirmado ativo');
            }
          }, 1000);
        })
        .catch((error) => {
          console.error('❌ Erro ao registrar Service Worker:', error);
        });
      
    } else {
      console.warn('⚠️ Service Worker não suportado neste navegador');
    }

    // Verificar se PWA pode ser instalado
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('✅ PWA pode ser instalado!');
      console.log('Evento beforeinstallprompt capturado');
      deferredPrompt = e;
      // NÃO prevenir o comportamento padrão - deixar o navegador mostrar o prompt
      // e.preventDefault(); // REMOVIDO para permitir instalação automática
    });

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App já está instalado como PWA!');
    }
    
    // Verificar critérios de instalação
    window.addEventListener('load', () => {
      setTimeout(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(registration => {
            if (registration && registration.active) {
              console.log('✅ Service Worker está ativo');
              console.log('✅ PWA deve estar pronto para instalação');
            } else {
              console.warn('⚠️ Service Worker não está ativo');
            }
          });
        }
      }, 2000);
    });
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

