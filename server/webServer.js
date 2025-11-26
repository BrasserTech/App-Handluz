// Servidor simples para servir o build web do app
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, '..', 'dist');

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

  res.writeHead(200, headers);
  
  // Ler arquivo como buffer para garantir integridade
  const fileBuffer = fs.readFileSync(filePath);
  res.end(fileBuffer);
}

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

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

