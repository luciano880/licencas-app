const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../database');
const authMw = require('../middleware/auth');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    const slug = username.trim().toLowerCase().replace(/\s+/g, '');
    const exists = await db.getAsync('SELECT id FROM users WHERE username = $1', slug);
    if (exists) return res.status(409).json({ error: 'Usuário já existe.' });
    const hash = bcrypt.hashSync(password, 10);
    const user = await db.getAsync(
      'INSERT INTO users (name, username, password) VALUES ($1, $2, $3) RETURNING *',
      name.trim(), slug, hash
    );
    res.status(201).json({ token: makeToken(user), user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.getAsync('SELECT * FROM users WHERE username = $1', (username || '').trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    res.json({ token: makeToken(user), user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/auth/me */
router.get('/me', authMw, async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id, name, username, role, created_at FROM users WHERE id = $1', req.user.id
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* PUT /api/auth/password */
router.put('/password', authMw, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Preencha os campos.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });
    const user = await db.getAsync('SELECT * FROM users WHERE id = $1', req.user.id);
    if (!bcrypt.compareSync(oldPassword, user.password))
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    await db.runAsync(
      'UPDATE users SET password = $1 WHERE id = $2',
      bcrypt.hashSync(newPassword, 10), user.id
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/auth/users */
router.get('/users', authMw, async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, name, username, role, created_at FROM users ORDER BY name');
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
