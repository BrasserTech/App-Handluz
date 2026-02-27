# Dockerfile unificado - App Handluz
# Funciona para desenvolvimento e produção

FROM node:20-alpine

WORKDIR /app

# Instalar apenas o necessário para servir com Nginx
RUN apk add --no-cache \
    nginx \
    curl \
    && rm -rf /var/cache/apk/*

# Instalar dependências do Node.js
COPY package*.json ./
RUN npm ci

# Copiar código fonte (incluindo .env se existir)
COPY . .

# Compilar o app para web
# O dotenv será carregado automaticamente pelo script de build se necessário
# As variáveis do .env estarão disponíveis via process.env durante o build
RUN npm run web:build

# Copiar build do frontend para nginx
RUN mkdir -p /usr/share/nginx/html && \
    cp -r dist/* /usr/share/nginx/html/ && \
    chown -R nginx:nginx /usr/share/nginx/html

# Configurar nginx
RUN mkdir -p /etc/nginx/http.d /var/log/nginx /var/cache/nginx /run/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /run/nginx

# Copiar configuração do nginx
COPY nginx/conf.d/default.conf /etc/nginx/http.d/default.conf

# Criar nginx.conf principal
RUN echo 'user nginx;' > /etc/nginx/nginx.conf && \
    echo 'worker_processes auto;' >> /etc/nginx/nginx.conf && \
    echo 'error_log /var/log/nginx/error.log warn;' >> /etc/nginx/nginx.conf && \
    echo 'pid /run/nginx.pid;' >> /etc/nginx/nginx.conf && \
    echo 'events {' >> /etc/nginx/nginx.conf && \
    echo '    worker_connections 1024;' >> /etc/nginx/nginx.conf && \
    echo '    use epoll;' >> /etc/nginx/nginx.conf && \
    echo '    multi_accept on;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '    default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '    sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '    tcp_nopush on;' >> /etc/nginx/nginx.conf && \
    echo '    tcp_nodelay on;' >> /etc/nginx/nginx.conf && \
    echo '    keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '    types_hash_max_size 2048;' >> /etc/nginx/nginx.conf && \
    echo '    client_max_body_size 20M;' >> /etc/nginx/nginx.conf && \
    echo '    gzip on;' >> /etc/nginx/nginx.conf && \
    echo '    gzip_vary on;' >> /etc/nginx/nginx.conf && \
    echo '    gzip_proxied any;' >> /etc/nginx/nginx.conf && \
    echo '    gzip_comp_level 6;' >> /etc/nginx/nginx.conf && \
    echo '    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/http.d/*.conf;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Expor portas
EXPOSE 3000

# Variáveis de ambiente
ENV PORT=3000
ENV FORCE_HTTP=true
ENV NODE_ENV=production

# Comando para iniciar Node.js em background e nginx em foreground
CMD sh -c "cd /app && node server/webServer.js & sleep 2 && nginx -g 'daemon off;'"
