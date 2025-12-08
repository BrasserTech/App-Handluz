// Servidor simples para servir o build web do app
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

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
  // Primeiro, tentar variável de ambiente
  if (process.env.INSTAGRAM_MAX_POSTS) {
    return parseInt(process.env.INSTAGRAM_MAX_POSTS);
  }
  
  // Tentar ler do arquivo constants/instagram.ts
  try {
    const instagramConfigPath = path.join(__dirname, '..', 'constants', 'instagram.ts');
    if (fs.existsSync(instagramConfigPath)) {
      const content = fs.readFileSync(instagramConfigPath, 'utf8');
      // Extrair maxPosts usando regex
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

  res.writeHead(200, headers);
  
  // Ler arquivo como buffer para garantir integridade
  const fileBuffer = fs.readFileSync(filePath);
  res.end(fileBuffer);
}

// Endpoint para buscar posts do Instagram
async function fetchInstagramPosts(username) {
  console.log(`[Instagram] Iniciando busca de posts para: ${username}`);
  
  // Método único: API oficial do Instagram
  try {
    const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    console.log(`[Instagram] Buscando posts via API: ${apiUrl}`);
    
    const result = await new Promise((resolve) => {
      const request = https.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://www.instagram.com',
          'Referer': 'https://www.instagram.com/',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
      }, (response) => {
        let data = '';
        
        let stream = response;
        if (response.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          stream = response.pipe(zlib.createGunzip());
        }
        
        stream.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        stream.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              console.error(`[Instagram] ❌ ERRO: Status code ${response.statusCode}`);
              let errorMessage = `Instagram retornou erro ${response.statusCode}`;
              let errorDetails = {};
              
              try {
                const errorJson = JSON.parse(data);
                errorDetails = errorJson;
                
                if (response.statusCode === 401) {
                  errorMessage = 'Instagram bloqueou a requisição (401 Unauthorized)';
                  if (errorJson.message) {
                    errorMessage += `: ${errorJson.message}`;
                  }
                } else if (response.statusCode === 403) {
                  errorMessage = 'Instagram bloqueou a requisição (403 Forbidden)';
                } else if (response.statusCode === 429) {
                  errorMessage = 'Instagram está limitando requisições (429 Too Many Requests)';
                }
              } catch (e) {
                errorDetails = { raw: data.substring(0, 500) };
              }
              
              console.error(`[Instagram] ${errorMessage}`);
              console.error(`[Instagram] Detalhes:`, errorDetails);
              
              resolve({ error: errorMessage, details: errorDetails, statusCode: response.statusCode, posts: [] });
              return;
            }
            
            const json = JSON.parse(data);
            
            if (json.data && json.data.user && json.data.user.edge_owner_to_timeline_media) {
              const posts = json.data.user.edge_owner_to_timeline_media.edges.slice(0, INSTAGRAM_MAX_POSTS).map((edge) => {
                const node = edge.node;
                return {
                  id: node.id,
                  shortcode: node.shortcode,
                  imageUrl: node.display_url || node.thumbnail_src,
                  caption: node.edge_media_to_caption?.edges[0]?.node?.text || '',
                  timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
                  permalink: `https://www.instagram.com/p/${node.shortcode}/`,
                  likes: node.edge_liked_by?.count || 0,
                };
              });
              resolve({ posts, error: null });
            } else {
              console.log(`[Instagram] Estrutura de dados não encontrada`);
              console.log(`[Instagram] JSON keys: ${Object.keys(json).join(', ')}`);
              if (json.data) {
                console.log(`[Instagram] json.data keys: ${Object.keys(json.data).join(', ')}`);
              }
              resolve({ 
                error: 'Estrutura de dados do Instagram não encontrada', 
                details: { jsonKeys: Object.keys(json) },
                posts: [] 
              });
            }
          } catch (err) {
            console.error(`[Instagram] Erro ao processar resposta:`, err.message);
            console.log(`[Instagram] Dados recebidos (primeiros 500 chars): ${data.substring(0, 500)}`);
            resolve({ 
              error: `Erro ao processar resposta do Instagram: ${err.message}`,
              details: { rawData: data.substring(0, 500) },
              posts: [] 
            });
          }
        });
        
        stream.on('error', (err) => {
          console.error(`[Instagram] Erro no stream:`, err.message);
          resolve({ 
            error: `Erro na conexão com Instagram: ${err.message}`,
            details: { type: 'stream_error' },
            posts: [] 
          });
        });
      });
      
      request.on('error', (err) => {
        console.error(`[Instagram] Erro na requisição:`, err.message);
        resolve({ 
          error: `Erro ao conectar com Instagram: ${err.message}`,
          details: { type: 'request_error' },
          posts: [] 
        });
      });
      
      request.on('timeout', () => {
        console.log(`[Instagram] Timeout na requisição`);
        request.destroy();
        resolve({ 
          error: 'Timeout ao buscar posts do Instagram (requisição demorou mais de 20 segundos)',
          details: { type: 'timeout' },
          posts: [] 
        });
      });
    });
    
    if (result.posts && result.posts.length > 0) {
      console.log(`[Instagram] Sucesso: ${result.posts.length} posts encontrados`);
      return result.posts;
    } else if (result.error) {
      console.error(`[Instagram] Erro: ${result.error}`);
      // Retornar resultado com erro para ser tratado no endpoint
      return result;
    } else {
      console.log(`[Instagram] Retornou 0 posts`);
      return { posts: [], error: 'Nenhum post encontrado', details: {} };
    }
  } catch (err) {
    console.error(`[Instagram] Erro ao buscar posts:`, err.message);
    return { 
      posts: [], 
      error: `Erro inesperado: ${err.message}`,
      details: { type: 'exception' }
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
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL da imagem não fornecida' }));
    return;
  }
  
  try {
    const urlObj = new URL(imageUrl);
    console.log(`[Image Proxy] Hostname: ${urlObj.hostname}`);
    
    // Verificar se é uma URL do Instagram/Facebook CDN
    if (!urlObj.hostname.includes('instagram') && !urlObj.hostname.includes('fbcdn')) {
      console.log(`[Image Proxy] Erro: URL não permitida (${urlObj.hostname})`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL não permitida' }));
      return;
    }
    
    console.log(`[Image Proxy] Buscando imagem: ${imageUrl.substring(0, 80)}...`);
    
    const request = https.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
      },
      timeout: 15000,
    }, (response) => {
      console.log(`[Image Proxy] Resposta recebida: ${response.statusCode} - Content-Type: ${response.headers['content-type']}`);
      
      if (response.statusCode !== 200) {
        console.log(`[Image Proxy] Erro: Status ${response.statusCode}`);
        res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Erro ao buscar imagem: ${response.statusCode}` }));
        return;
      }
      
      res.writeHead(200, {
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      });
      
      response.pipe(res);
    });
    
    request.on('error', (err) => {
      console.error(`[Image Proxy] Erro na requisição:`, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar imagem' }));
    });
    
    request.on('timeout', () => {
      console.error(`[Image Proxy] Timeout ao buscar imagem`);
      request.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Timeout ao buscar imagem' }));
    });
  } catch (err) {
    console.error(`[Image Proxy] Erro ao processar URL:`, err.message);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL inválida' }));
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
      return;
    }
    
    fetchInstagramPosts(username).then((result) => {
      // Verificar se result é um array (sucesso antigo) ou objeto com posts/error
      let posts = [];
      let error = null;
      let details = {};
      
      if (Array.isArray(result)) {
        // Formato antigo (compatibilidade)
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

