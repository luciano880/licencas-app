const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

/* Helpers com mesma interface usada nas rotas */
const db = {
  getAsync: (sql, ...params) =>
    pool.query(sql, params).then(r => r.rows[0] || null),

  allAsync: (sql, ...params) =>
    pool.query(sql, params).then(r => r.rows),

  runAsync: (sql, ...params) =>
    pool.query(sql, params).then(r => ({
      lastID:  r.rows[0]?.id ?? null,
      changes: r.rowCount,
    })),
};

module.exports = db;
