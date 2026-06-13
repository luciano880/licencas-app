const https = require('https');

function monthsLeft(dateStr) {
  return (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24 * 30.44);
}

function statusLabel(m) {
  if (m < 0)  return { text: 'VENCIDA',  color: '#A32D2D', bg: '#FCEBEB' };
  if (m <= 6) return { text: 'URGENTE',  color: '#A32D2D', bg: '#FCEBEB' };
  if (m <= 10) return { text: 'ATENÇÃO', color: '#854F0B', bg: '#FAEEDA' };
  return { text: 'EM DIA', color: '#3B6D11', bg: '#EAF3DE' };
}

function buildAlertHtml(company) {
  const m = monthsLeft(company.vencimento);
  const s = statusLabel(m);
  const expDate = new Date(company.vencimento + 'T12:00:00').toLocaleDateString('pt-BR');
  const mStr = m < 0 ? 'Vencida' : Math.round(m) + ' meses restantes';
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="border-left:4px solid ${s.color};padding-left:16px;margin-bottom:24px">
    <h2 style="margin:0;font-size:18px">[${s.text}] Licença próxima do vencimento</h2>
    <p style="margin:4px 0 0;color:#555;font-size:13px">Alerta automático — Cherobin Assessoria Ambiental e Agrícola</p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#555;width:40%">Empresa</td><td style="font-weight:bold">${company.nome}</td></tr>
    <tr><td style="padding:8px 0;color:#555">CNPJ</td><td>${company.cnpj || '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Tipo de licença</td><td>${company.tipo || '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Vencimento</td><td>${expDate}</td></tr>
    <tr><td style="padding:8px 0;color:#555">Situação</td>
        <td><span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:99px;font-size:12px;font-weight:bold">${s.text} — ${mStr}</span></td></tr>
    ${company.obs ? `<tr><td style="padding:8px 0;color:#555">Observações</td><td>${company.obs}</td></tr>` : ''}
  </table>
  <p style="margin-top:24px;font-size:13px;color:#888">Providencie a renovação com antecedência para evitar irregularidades.</p>
</body></html>`;
}

function buildProtoHtml(company, customMsg) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="font-size:18px;margin-bottom:16px">Licença Protocolada — ${company.nome}</h2>
  ${customMsg.split('\n').map(l => `<p style="margin:4px 0;font-size:14px">${l}</p>`).join('')}
  <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
  <p style="font-size:12px;color:#aaa">Enviado por Cherobin Assessoria Ambiental e Agrícola</p>
</body></html>`;
}

function brevoSend({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { name: 'Cherobin Assessoria', email: 'ae9b89001@smtp-brevo.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_SMTP_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Brevo ${res.statusCode}: ${data}`));
        else resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendAlert(company) {
  const m = monthsLeft(company.vencimento);
  const s = statusLabel(m);
  await brevoSend({
    to: company.email_interno,
    subject: `[${s.text}] Vencimento: ${company.nome} — ${new Date(company.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}`,
    html: buildAlertHtml(company),
  });
}

async function sendProto(company, customMsg) {
  await brevoSend({
    to: company.email_empresa,
    subject: `Licença protocolada — ${company.nome}`,
    html: buildProtoHtml(company, customMsg),
  });
}

module.exports = { sendAlert, sendProto, monthsLeft };
