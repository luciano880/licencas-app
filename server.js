require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const cron    = require('node-cron');
const db      = require('./database');
const { sendAlert, monthsLeft } = require('./mailer');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── ROTAS ── */
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/companies',     require('./routes/companies'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/renewals',      require('./routes/renewals'));
app.use('/api/clients',       require('./routes/clients'));
app.use('/api/backup',        require('./routes/backup'));

/* Todas as rotas não-API servem o frontend */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── CRON: alertas automáticos diários ── */
const schedule = process.env.CRON_SCHEDULE || '0 8 * * *';
cron.schedule(schedule, async () => {
  console.log('[cron] Verificando vencimentos —', new Date().toLocaleString('pt-BR'));
  const companies = await db.allAsync(
    "SELECT * FROM companies WHERE email_interno IS NOT NULL AND email_interno != ''"
  );

  const targets = companies.filter(c => monthsLeft(c.vencimento) <= 10);
  console.log(`[cron] ${targets.length} licença(s) para alertar.`);

  for (const c of targets) {
    try {
      await sendAlert(c);
      console.log(`[cron] Alerta enviado: ${c.nome} → ${c.email_interno}`);
    } catch (err) {
      console.error(`[cron] Erro ao enviar para ${c.nome}:`, err.message);
    }
  }
}, { timezone: 'America/Sao_Paulo' });

app.listen(PORT, () => {
  console.log(`\n✔  Servidor rodando em http://localhost:${PORT}`);
  console.log(`   Alertas automáticos: ${schedule} (America/Sao_Paulo)\n`);
});
