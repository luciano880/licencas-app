const router = require('express').Router();
const db     = require('../database');
const authMw = require('../middleware/auth');

router.use(authMw);

/* GET /api/backup */
router.get('/', async (req, res) => {
  try {
    const companies = await db.allAsync('SELECT * FROM companies WHERE user_id = $1 ORDER BY id', req.user.id);
    const renewals  = await db.allAsync(`SELECT r.* FROM renewals r JOIN companies c ON c.id=r.company_id WHERE c.user_id=$1 ORDER BY r.id`, req.user.id);
    res.json({ companies, renewals, exported_at: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/backup/restore */
router.post('/restore', async (req, res) => {
  try {
    const { companies = [] } = req.body;
    let inserted = 0;
    for (const c of companies) {
      const exists = await db.getAsync('SELECT id FROM companies WHERE cnpj=$1 AND user_id=$2', c.cnpj||null, req.user.id);
      if (exists) continue;
      await db.runAsync(
        `INSERT INTO companies (user_id,nome,cnpj,tipo,vencimento,estado,cidade,email_empresa,email_interno,obs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        req.user.id, c.nome, c.cnpj||null, c.tipo||null, c.vencimento,
        c.estado||null, c.cidade||null, c.email_empresa||null, c.email_interno||null, c.obs||null
      );
      inserted++;
    }
    res.json({ ok: true, inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
