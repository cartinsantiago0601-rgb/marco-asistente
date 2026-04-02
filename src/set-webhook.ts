import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL;
const SECRET = process.env.WEBHOOK_SECRET || '';

if (!TOKEN || !VERCEL_URL) {
  console.error('Necesitas TELEGRAM_BOT_TOKEN y VERCEL_URL en .env');
  console.error('VERCEL_URL ejemplo: https://marco-asistente.vercel.app');
  process.exit(1);
}

const webhookUrl = `${VERCEL_URL}/api/webhook`;

async function setWebhook() {
  const params = new URLSearchParams({ url: webhookUrl });
  if (SECRET) params.append('secret_token', SECRET);

  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/setWebhook?${params}`
  );
  const data = await res.json();

  if (data.ok) {
    console.log(`Webhook registrado: ${webhookUrl}`);
  } else {
    console.error('Error registrando webhook:', data);
  }

  // Verificar
  const infoRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log('Webhook info:', JSON.stringify(info.result, null, 2));
}

setWebhook();
