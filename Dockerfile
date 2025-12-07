# Dockerfile unificado - App Handluz
# Funciona para desenvolvimento e produção

FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte (volumes serão montados em desenvolvimento)
COPY . .

# Expor porta
EXPOSE 4500

# Variáveis de ambiente
ENV PORT=4500
ENV FORCE_HTTP=true
ENV NODE_ENV=${NODE_ENV:-production}
