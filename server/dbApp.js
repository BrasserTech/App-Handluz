// server/dbApp.js
// Cliente central da Supabase para o app HandLuz

console.log('[db-app] CARREGANDO ARQUIVO:', __filename);

const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = require('./supabaseKeys');

// Verificar se as chaves estão configuradas antes de criar o cliente
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  // Cria o cliente Supabase (backend: pode usar service_role)
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('[db-app] INIT -------------------------------');
  console.log('[db-app] URL         =', SUPABASE_URL);
  console.log('[db-app] SERVICE_KEY = (definida, uso apenas no backend)');
  console.log('-------------------------------------------');

  // Teste simples de conexão/acesso: tenta ler algo da tabela "teams"
  (async () => {
    try {
      const { data, error } = await supabase
        .from('teams')        // ajuste se quiser outra tabela
        .select('id')
        .limit(1);

      if (error) {
        console.error('[db-app] ERRO AO CONSULTAR Supabase:', error.message);
      } else {
        console.log('[db-app] Supabase OK, teste em "teams" retornou:', data?.length || 0, 'linha(s)');
      }
    } catch (err) {
      console.error('[db-app] ERRO GERAL SUPABASE:', err.message);
    }
  })();
} else {
  console.warn('[db-app] ⚠️  Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  console.warn('[db-app] ⚠️  Funcionalidades que dependem do Supabase não estarão disponíveis.');
}

// Exporta o cliente para ser usado pelos controllers
module.exports = {
  supabase,
};
