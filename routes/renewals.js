const router = require('express').Router();
const db     = require('../database');
const authMw = require('../middleware/auth');

router.use(authMw);

/* GET /api/renewals/:companyId — lista histórico */
router.get('/:companyId', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT r.*, u.name as renewed_by_name
      FROM renewals r
      JOIN users u ON u.id = r.renewed_by
      WHERE r.company_id = $1
      ORDER BY r.created_at DESC
    `, req.params.companyId);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/renewals — registrar renovação e atualizar vencimento */
router.post('/', async (req, res) => {
  try {
    const { company_id, new_venc, obs } = req.body;
    if (!company_id || !new_venc) return res.status(400).json({ error: 'company_id e new_venc são obrigatórios.' });

    const company = await db.getAsync(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2', company_id, req.user.id
    );
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const renewal = await db.getAsync(`
      INSERT INTO renewals (company_id, renewed_by, old_venc, new_venc, obs)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, company_id, req.user.id, company.vencimento, new_venc, obs || null);

    await db.runAsync(
      `UPDATE companies SET vencimento=$1, updated_at=NOW() WHERE id=$2`,
      new_venc, company_id
    );

    res.status(201).json(renewal);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
