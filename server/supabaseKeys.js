// server/supabaseKeys.js
// *** APENAS PARA USO NO BACKEND ***
// Aqui você coloca as chaves do projeto HandLuz no Supabase.
// NÃO coloque este arquivo em builds do app mobile/web.

const SUPABASE_URL = 'https://SEUProjeto.supabase.co';

// ⚠️ IMPORTANTE: use aqui a SERVICE ROLE KEY (secret) APENAS no backend.
// Exemplo de formato: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
const SUPABASE_SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI';

// Exporta como constantes
module.exports = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
};
