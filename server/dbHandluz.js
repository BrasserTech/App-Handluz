// src/main/ipc/dbHandluz.js
// Conexão central com o Postgres do HandLuz (BTHandluz)

console.log('[db-handluz] CARREGANDO ARQUIVO:', __filename);

const { Pool } = require('pg');
require('dotenv').config();

// Configurações padrão – servidor pessoal
const DEFAULT_CONFIG = {
  host: '46.224.60.50',
  port: 5432,
  user: 'ak47AB',
  password: 'PersonalAdminPost3281',
  database: 'BTHandluz', // banco já criado no servidor
};

// Helper para buscar variáveis de ambiente ou usar padrão
function getConfigValue(key, defaultValue) {
  // 1) DB_*
  const dbValue = process.env[`DB_${key}`];
  if (dbValue !== undefined && dbValue !== '') return dbValue;

  // 2) PG_*
  const pgValue = process.env[`PG_${key}`];
  if (pgValue !== undefined && pgValue !== '') return pgValue;

  // 3) padrão
  return defaultValue;
}

// Monta objeto de configuração final
const dbConfig = {
  host: String(getConfigValue('HOST', DEFAULT_CONFIG.host)),
  port: Number(getConfigValue('PORT', DEFAULT_CONFIG.port)),
  user: String(getConfigValue('USER', DEFAULT_CONFIG.user)),
  password: String(getConfigValue('PASSWORD', DEFAULT_CONFIG.password)),
  database: String(getConfigValue('DATABASE', DEFAULT_CONFIG.database)),
};

console.log('[db-handluz] INIT --------------------------------');
console.log('[db-handluz] host     =', dbConfig.host);
console.log('[db-handluz] port     =', dbConfig.port);
console.log('[db-handluz] user     =', dbConfig.user);
console.log(
  '[db-handluz] password =',
  dbConfig.password ? '(definida, ' + dbConfig.password.length + ' chars)' : '(NÃO definida)'
);
console.log('[db-handluz] database =', dbConfig.database);
console.log('-----------------------------------------------');

if (!dbConfig.password) {
  console.warn('[db-handluz] AVISO: nenhuma senha configurada. Se o Postgres exigir senha, irá falhar.');
}

// Cria pool único para o BTHandluz
const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Teste imediato da conexão
(async () => {
  try {
    const client = await pool.connect();
    console.log('[db-handluz] Conexão estabelecida com sucesso ao banco:', dbConfig.database);
    client.release();
  } catch (err) {
    console.error('[db-handluz] ERRO AO CONECTAR AO BANCO:', err.message);
  }
})();

// Função genérica de query (igual ao outro projeto)
async function query(text, params) {
  return pool.query(text, params);
}

// Caso você precise de transações complexas,
// pode pegar um client manualmente:
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
};
