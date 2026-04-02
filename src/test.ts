import { config } from './config.js';
import { groq } from './llm.js';
import { getMessages } from './db.js';

async function test() {
  try {
    console.log('Probando Groq...');
    const r = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'di hola en una palabra' }],
      max_tokens: 50,
    });
    console.log('Groq OK:', r.choices[0]?.message?.content);
  } catch (e: any) {
    console.error('Groq ERROR:', e.message);
    if (e.status) console.error('Status:', e.status);
  }

  try {
    console.log('Probando Firebase...');
    const msgs = await getMessages('test', 1);
    console.log('Firebase OK');
  } catch (e: any) {
    console.error('Firebase ERROR:', e.message);
  }

  process.exit(0);
}
test();
