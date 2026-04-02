import dotenv from 'dotenv';
dotenv.config();

export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN as string,
  TELEGRAM_ALLOWED_USER_IDS: process.env.TELEGRAM_ALLOWED_USER_IDS as string,
  GROQ_API_KEY: process.env.GROQ_API_KEY as string,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID as string,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL as string,
  FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r'),
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
};

const required = [
  'TELEGRAM_BOT_TOKEN',
  'GROQ_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

for (const req of required) {
  if (!config[req as keyof typeof config]) {
    throw new Error(`Falta variable de entorno: ${req}`);
  }
}

export const ALLOWED_USER_IDS = (config.TELEGRAM_ALLOWED_USER_IDS || '')
  .split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));
