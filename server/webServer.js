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

// Endpoint para buscar posts do Instagram
async function fetchInstagramPosts(username) {
  // Método 1: Tentar API oficial do Instagram
  try {
    const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    
    const posts = await new Promise((resolve) => {
      const request = https.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'X-IG-App-ID': '936619743392459',
        },
        timeout: 15000,
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
              resolve([]);
              return;
            }
            
            const json = JSON.parse(data);
            
            if (json.data && json.data.user && json.data.user.edge_owner_to_timeline_media) {
              const posts = json.data.user.edge_owner_to_timeline_media.edges.slice(0, 12).map((edge) => {
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
              resolve(posts);
            } else {
              resolve([]);
            }
          } catch (err) {
            resolve([]);
          }
        });
        
        stream.on('error', () => {
          resolve([]);
        });
      });
      
      request.on('error', () => {
        resolve([]);
      });
      
      request.on('timeout', () => {
        request.destroy();
        resolve([]);
      });
    });
    
    if (posts.length > 0) {
      return posts;
    }
  } catch (err) {
    // Continuar para método alternativo
  }

  // Método 2: Buscar via página HTML
  try {
    const profileUrl = `https://www.instagram.com/${username}/`;
    
    const posts = await new Promise((resolve) => {
      const request = https.get(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        timeout: 15000,
      }, (response) => {
        let html = '';
        
        response.on('data', (chunk) => {
          html += chunk.toString();
        });
        
        response.on('end', () => {
          try {
            const match = html.match(/window\._sharedData\s*=\s*({.+?});/s);
            if (match && match[1]) {
              const jsonData = JSON.parse(match[1]);
              const user = jsonData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
              
              if (user?.edge_owner_to_timeline_media?.edges) {
                const posts = user.edge_owner_to_timeline_media.edges.slice(0, 12).map((edge) => {
                  const node = edge.node;
                  return {
                    id: node.id || node.shortcode,
                    shortcode: node.shortcode,
                    imageUrl: node.display_url || node.thumbnail_src,
                    caption: node.edge_media_to_caption?.edges[0]?.node?.text || '',
                    timestamp: new Date((node.taken_at_timestamp || Date.now() / 1000) * 1000).toISOString(),
                    permalink: `https://www.instagram.com/p/${node.shortcode}/`,
                    likes: node.edge_liked_by?.count || 0,
                  };
                });
                resolve(posts);
              } else {
                resolve([]);
              }
            } else {
              resolve([]);
            }
          } catch (err) {
            resolve([]);
          }
        });
      });
      
      request.on('error', () => {
        resolve([]);
      });
      
      request.on('timeout', () => {
        request.destroy();
        resolve([]);
      });
    });
    
    if (posts.length > 0) {
      return posts;
    }
  } catch (err) {
    // Retornar vazio
  }

  return [];
}

// Proxy para imagens do Instagram (resolve problema de CORS)
function proxyImage(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const imageUrl = parsedUrl.query.url;
  
  if (!imageUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL da imagem não fornecida' }));
    return;
  }
  
  try {
    const urlObj = new URL(imageUrl);
    
    // Verificar se é uma URL do Instagram/Facebook CDN
    if (!urlObj.hostname.includes('instagram') && !urlObj.hostname.includes('fbcdn')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL não permitida' }));
      return;
    }
    
    const request = https.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    }, (response) => {
      res.writeHead(response.statusCode, {
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      
      response.pipe(res);
    });
    
    request.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar imagem' }));
    });
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL inválida' }));
  }
}

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

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

  // Endpoint para buscar posts do Instagram
  if (pathname === '/api/instagram/posts') {
    const username = parsedUrl.query.username || 'handluzerna';
    
    // Detectar protocolo e host da requisição
    const protocol = req.headers['x-forwarded-proto'] || (useHTTPS ? 'https' : 'http');
    const host = req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    
    fetchInstagramPosts(username).then((posts) => {
      // Substituir URLs das imagens por proxy
      const postsWithProxy = posts.map(post => ({
        ...post,
        imageUrl: post.imageUrl 
          ? `${baseUrl}/api/instagram/image?url=${encodeURIComponent(post.imageUrl)}`
          : post.imageUrl
      }));
      
      res.end(JSON.stringify({ success: true, posts: postsWithProxy }));
    }).catch((err) => {
      res.end(JSON.stringify({ success: false, error: err.message, posts: [] }));
    });
    
    return;
  }

  // Endpoint para proxy de imagens
  if (pathname === '/api/instagram/image') {
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

