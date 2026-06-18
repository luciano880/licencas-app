const router = require('express').Router();
const db     = require('../database');
const authMw = require('../middleware/auth');
const { sendAlert, sendProto, monthsLeft } = require('../mailer');

/* GET /api/notifications/cron?key=CRON_SECRET — chamado pelo cron-job.org */
router.get('/cron', async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET)
    return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const companies = await db.allAsync(
      "SELECT * FROM companies WHERE email_interno IS NOT NULL AND email_interno <> ''"
    );
    const targets = companies.filter(c => monthsLeft(c.vencimento) <= 10);
    const results = [];
    for (const c of targets) {
      try { await sendAlert(c); results.push({ nome: c.nome, ok: true }); }
      catch (err) { results.push({ nome: c.nome, ok: false, error: err.message }); }
    }
    console.log('[cron-ext] Alertas enviados:', results);
    res.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.use(authMw);

/* POST /api/notifications/alerts */
router.post('/alerts', async (req, res) => {
  try {
    const companies = await db.allAsync(
      "SELECT * FROM companies WHERE user_id = $1 AND email_interno IS NOT NULL AND email_interno <> ''",
      req.user.id
    );
    const targets = companies.filter(c => monthsLeft(c.vencimento) <= 10);
    if (!targets.length) return res.json({ sent: 0, message: 'Nenhuma licença necessita alerta.' });
    const results = [];
    for (const c of targets) {
      try { await sendAlert(c); results.push({ id: c.id, nome: c.nome, ok: true }); }
      catch (err) { results.push({ id: c.id, nome: c.nome, ok: false, error: err.message }); }
    }
    res.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/notifications/proto/:id */
router.post('/proto/:id', async (req, res) => {
  try {
    const company = await db.getAsync(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2', req.params.id, req.user.id
    );
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
    if (!company.email_empresa) return res.status(400).json({ error: 'E-mail da empresa não cadastrado.' });
    const msg = req.body.message ||
      `Prezado(a),\n\nInformamos que a licença "${company.tipo || 'licença'}" da empresa ${company.nome} foi protocolada junto ao órgão competente.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente.`;
    await sendProto(company, msg);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Falha ao enviar e-mail: ' + e.message }); }
});

module.exports = router;
