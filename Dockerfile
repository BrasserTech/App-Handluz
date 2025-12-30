# Dockerfile unificado - App Handluz
# Funciona para desenvolvimento e produção

FROM node:20-alpine

WORKDIR /app

# Instalar Chromium e dependências do sistema necessárias para Puppeteer/Chromium funcionar
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    udev \
    ttf-opensans \
    && rm -rf /var/cache/apk/*

# Instalar dependências de runtime necessárias para Chrome
RUN apk add --no-cache \
    libgcc \
    libstdc++ \
    libx11 \
    libxcomposite \
    libxdamage \
    libxext \
    libxfixes \
    libxrandr \
    libxrender \
    libxtst \
    cups-libs \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar o Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependências do Node.js
COPY package*.json ./
RUN npm ci

# Verificar se Chromium está instalado
RUN chromium-browser --version || chromium --version || echo "Verificando Chromium..."

# Copiar código fonte (incluindo .env se existir)
COPY . .

# Compilar o app para web
# O dotenv será carregado automaticamente pelo script de build se necessário
# As variáveis do .env estarão disponíveis via process.env durante o build
RUN npm run web:build

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV PORT=3000
ENV FORCE_HTTP=true
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "server/webServer.js"]
