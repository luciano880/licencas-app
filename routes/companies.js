const router = require('express').Router();
const db     = require('../database');
const authMw = require('../middleware/auth');

router.use(authMw);

/* GET /api/companies */
router.get('/', async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT * FROM companies WHERE user_id = $1 ORDER BY vencimento ASC', req.user.id
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/companies */
router.post('/', async (req, res) => {
  try {
    const { nome, cnpj, tipo, vencimento, estado, cidade, email_empresa, email_interno, obs } = req.body;
    if (!nome || !vencimento)
      return res.status(400).json({ error: 'Nome e vencimento são obrigatórios.' });
    const row = await db.getAsync(
      `INSERT INTO companies (user_id,nome,cnpj,tipo,vencimento,estado,cidade,email_empresa,email_interno,obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      req.user.id, nome.trim(), cnpj||null, tipo||null, vencimento,
      estado||null, cidade||null, email_empresa||null, email_interno||null, obs||null
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* PUT /api/companies/:id */
router.put('/:id', async (req, res) => {
  try {
    const row = await db.getAsync(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2', req.params.id, req.user.id
    );
    if (!row) return res.status(404).json({ error: 'Não encontrado.' });
    const { nome, cnpj, tipo, vencimento, estado, cidade, email_empresa, email_interno, obs } = req.body;
    const updated = await db.getAsync(
      `UPDATE companies
       SET nome=$1,cnpj=$2,tipo=$3,vencimento=$4,estado=$5,cidade=$6,
           email_empresa=$7,email_interno=$8,obs=$9,updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      nome||row.nome, cnpj||null, tipo||null, vencimento||row.vencimento,
      estado||null, cidade||null, email_empresa||null, email_interno||null, obs||null, row.id
    );
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* DELETE /api/companies/:id */
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.runAsync(
      'DELETE FROM companies WHERE id = $1 AND user_id = $2', req.params.id, req.user.id
    );
    if (!result.changes) return res.status(404).json({ error: 'Não encontrado.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
