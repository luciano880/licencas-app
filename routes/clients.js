const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');
const authMw  = require('../middleware/auth');

function makeClientToken(client) {
  return jwt.sign(
    { clientId: client.id, companyId: client.company_id, role: 'client' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function clientAuthMw(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token não fornecido.' });
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'client') return res.status(403).json({ error: 'Acesso negado.' });
    req.client = decoded;
    next();
  } catch { res.status(401).json({ error: 'Token inválido.' }); }
}

/* POST /api/clients/login */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const client = await db.getAsync('SELECT * FROM clients WHERE username = $1', (username||'').trim().toLowerCase());
    if (!client || !bcrypt.compareSync(password, client.password))
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const company = await db.getAsync('SELECT id, nome, cnpj FROM companies WHERE id = $1', client.company_id);
    res.json({ token: makeClientToken(client), company });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/clients/licenses — licenças do cliente logado */
router.get('/licenses', clientAuthMw, async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT * FROM companies WHERE id = $1 ORDER BY vencimento ASC', req.client.companyId
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/clients/renewals — histórico do cliente logado */
router.get('/renewals', clientAuthMw, async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT r.*, u.name as renewed_by_name
      FROM renewals r
      JOIN users u ON u.id = r.renewed_by
      WHERE r.company_id = $1
      ORDER BY r.created_at DESC
    `, req.client.companyId);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Rotas protegidas para admins gerenciarem clientes ── */
/* POST /api/clients — criar acesso cliente */
router.post('/', authMw, async (req, res) => {
  try {
    const { company_id, username, password } = req.body;
    if (!company_id || !username || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres.' });
    const slug = username.trim().toLowerCase().replace(/\s+/g, '');
    const exists = await db.getAsync('SELECT id FROM clients WHERE username = $1', slug);
    if (exists) return res.status(409).json({ error: 'Usuário já existe.' });
    const hash = bcrypt.hashSync(password, 10);
    const client = await db.getAsync(
      'INSERT INTO clients (company_id, username, password) VALUES ($1,$2,$3) RETURNING id, company_id, username, created_at',
      company_id, slug, hash
    );
    res.status(201).json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/clients/:companyId — buscar cliente da empresa */
router.get('/:companyId', authMw, async (req, res) => {
  try {
    const client = await db.getAsync(
      'SELECT id, company_id, username, created_at FROM clients WHERE company_id = $1', req.params.companyId
    );
    res.json(client || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* DELETE /api/clients/:id — remover acesso */
router.delete('/:id', authMw, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM clients WHERE id = $1', req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
