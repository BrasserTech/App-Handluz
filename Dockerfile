# Dockerfile unificado - App Handluz
# Funciona para desenvolvimento e produção

FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Compilar o app para web
RUN npm run web:build

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV PORT=3000
ENV FORCE_HTTP=true
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "server/webServer.js"]
