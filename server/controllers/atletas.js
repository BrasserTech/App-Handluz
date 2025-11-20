// exemplo: src/main/ipc/atletas.js
const db = require('../dbHandluz');

async function listarAtletas() {
  const sql = 'select id, nome_completo, apelido, data_nascimento from atletas order by nome_completo';
  const result = await db.query(sql);
  return result.rows;
}

module.exports = {
  listarAtletas,
};
