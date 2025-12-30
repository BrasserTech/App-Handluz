// server/supabaseKeys.js
// *** APENAS PARA USO NO BACKEND ***
// Chaves do Supabase lidas de variáveis de ambiente para melhor segurança.
// Configure as variáveis no arquivo .env, no Dockge, ou nas variáveis de ambiente do sistema.

// Carregar variáveis de ambiente do arquivo .env (se existir)
// No Docker, as variáveis do compose.yml já estarão em process.env
require('dotenv').config();

// Debug: verificar se estamos no Docker
const fs = require('fs');
const isDocker = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv');
if (isDocker) {
  console.log('[Supabase Keys] 🐳 Executando no Docker - variáveis devem vir do compose.yml/Dockge');
}

// URL do projeto Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error('[Supabase Keys] ❌ SUPABASE_URL não encontrada!');
  console.error('[Supabase Keys] ⚠️  Configure no arquivo .env, no Dockge, ou nas variáveis de ambiente.');
  console.error('[Supabase Keys] ⚠️  O servidor pode não funcionar corretamente sem esta configuração.');
} else {
  console.log('[Supabase Keys] ✅ SUPABASE_URL encontrada');
}

// ⚠️ IMPORTANTE: use aqui a SERVICE ROLE KEY (secret) APENAS no backend.
// Esta chave NUNCA deve ser exposta no frontend ou no código do cliente.
// Configure no arquivo .env, no Dockge, ou nas variáveis de ambiente como SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Supabase Keys] ❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  console.error('[Supabase Keys] ⚠️  Configure no arquivo .env, no Dockge, ou nas variáveis de ambiente.');
  console.error('[Supabase Keys] ⚠️  Funcionalidades do backend que usam Supabase não funcionarão.');
} else {
  console.log('[Supabase Keys] ✅ SUPABASE_SERVICE_ROLE_KEY encontrada');
}

// Exporta como constantes
module.exports = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
};
