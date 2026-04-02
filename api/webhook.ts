import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processMessage } from '../src/agent.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG = `https://api.telegram.org/bot${TOKEN}`;

async function tgPost(method: string, body: object) {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId: number, text: string) {
  const chunks = text.match(/[\s\S]{1,4096}/g) || [text];
  for (const chunk of chunks) {
    try {
      const result = await tgPost('sendMessage', {
        chat_id: chatId,
        text: chunk,
        parse_mode: 'Markdown',
      }) as any;
      if (!result.ok) {
        // Reintentar sin Markdown si falla el parsing
        await tgPost('sendMessage', { chat_id: chatId, text: chunk });
      }
    } catch (e) {
      console.error('Error sendMessage:', e);
    }
  }
}

async function sendTyping(chatId: number) {
  await tgPost('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function getFileUrl(fileId: string): Promise<string | undefined> {
  try {
    const data = await tgPost('getFile', { file_id: fileId }) as any;
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error('Error getFile:', e);
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  // Responder 200 a Telegram de inmediato para evitar reintentos
  res.status(200).json({ ok: true });

  try {
    const update = req.body;
    const message = update?.message;
    if (!message) return;

    const chatId: number = message.chat.id;
    const userId: string = String(message.from?.id ?? chatId);
    const text: string = message.text || '';

    // Comando /start
    if (text === '/start') {
      await sendMessage(chatId, 'MARCO activo. Dispara.');
      return;
    }

    // Mensaje de texto
    if (text) {
      await sendTyping(chatId);
      const reply = await processMessage(userId, text);
      await sendMessage(chatId, reply);
      return;
    }

    // Foto
    if (message.photo) {
      await sendTyping(chatId);
      const best = message.photo[message.photo.length - 1];
      const imageUrl = await getFileUrl(best.file_id);
      const caption: string = message.caption || '';
      const reply = await processMessage(userId, caption, imageUrl);
      await sendMessage(chatId, reply);
      return;
    }
  } catch (error: any) {
    console.error('Error procesando update:', error?.message || error);
  }
}
