import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {};

  // 1. Check env vars exist
  results.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ? 'OK' : 'MISSING';
  results.GROQ_API_KEY = process.env.GROQ_API_KEY ? 'OK' : 'MISSING';
  results.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'MISSING';
  results.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ? 'OK' : 'MISSING';
  results.FIREBASE_PRIVATE_KEY_LENGTH = String(process.env.FIREBASE_PRIVATE_KEY?.length || 0);
  results.FIREBASE_PRIVATE_KEY_STARTS = process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || 'EMPTY';

  // 2. Test Groq
  try {
    const { default: OpenAI } = await import('openai');
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const r = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'di ok' }],
      max_tokens: 10,
    });
    results.GROQ_TEST = r.choices[0]?.message?.content || 'empty';
  } catch (e: any) {
    results.GROQ_TEST = `ERROR: ${e.message}`;
  }

  // 3. Test Firebase
  try {
    const admin = await import('firebase-admin');
    const pk = (process.env.FIREBASE_PRIVATE_KEY || '')
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r');

    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: pk,
        }),
      });
    }
    const db = admin.default.firestore();
    await db.collection('marco_chats').doc('debug-test').set({ test: true });
    results.FIREBASE_TEST = 'OK';
  } catch (e: any) {
    results.FIREBASE_TEST = `ERROR: ${e.message}`;
  }

  res.status(200).json(results);
}
