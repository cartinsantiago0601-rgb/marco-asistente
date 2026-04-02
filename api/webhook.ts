import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processMessage } from '../src/agent.js';
import { clearHistory, getNotes, deleteNote } from '../src/db.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG = `https://api.telegram.org/bot${TOKEN}`;

async function tgPost(method: string, body: object): Promise<any> {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Envía un mensaje y devuelve el message_id
async function sendMessage(chatId: number, text: string, parseMode = 'Markdown'): Promise<number | undefined> {
  const chunks = text.match(/[\s\S]{1,4096}/g) || [text];
  let lastMsgId: number | undefined;

  for (const chunk of chunks) {
    try {
      const result = await tgPost('sendMessage', { chat_id: chatId, text: chunk, parse_mode: parseMode });
      if (result.ok) {
        lastMsgId = result.result?.message_id;
      } else {
        // Reintentar sin formato si falla el Markdown
        const fallback = await tgPost('sendMessage', { chat_id: chatId, text: chunk });
        if (fallback.ok) lastMsgId = fallback.result?.message_id;
      }
    } catch (e) {
      console.error('sendMessage error:', e);
    }
  }
  return lastMsgId;
}

// Edita un mensaje existente
async function editMessage(chatId: number, messageId: number, text: string): Promise<void> {
  if (text.length > 4096) {
    // Si la respuesta es larga, editar con la primera parte y enviar el resto
    const chunks = text.match(/[\s\S]{1,4096}/g) || [text];
    try {
      await tgPost('editMessageText', { chat_id: chatId, message_id: messageId, text: chunks[0], parse_mode: 'Markdown' });
    } catch {
      await tgPost('editMessageText', { chat_id: chatId, message_id: messageId, text: chunks[0] });
    }
    for (const chunk of chunks.slice(1)) {
      await sendMessage(chatId, chunk);
    }
    return;
  }

  try {
    const result = await tgPost('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown' });
    if (!result.ok) {
      await tgPost('editMessageText', { chat_id: chatId, message_id: messageId, text });
    }
  } catch (e) {
    console.error('editMessage error:', e);
    await sendMessage(chatId, text);
  }
}

async function sendTyping(chatId: number): Promise<void> {
  await tgPost('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function getFileUrl(fileId: string): Promise<string | undefined> {
  try {
    const data = await tgPost('getFile', { file_id: fileId });
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error('getFile error:', e);
  }
  return undefined;
}

// ─── Manejadores de comandos ──────────────────────────────────────────────────

async function handleStart(chatId: number): Promise<void> {
  const msg = `*MARCO activo.*

Soy tu asesor de negocios. Directo, sin filtros.

*Comandos disponibles:*
/nuevo — Resetea la conversación (la memoria persistente se mantiene)
/memoria — Ver notas guardadas sobre tus negocios
/borrar N — Borrar la nota número N de la memoria

Dispara.`;
  await sendMessage(chatId, msg);
}

async function handleNuevo(chatId: number, userId: string): Promise<void> {
  await clearHistory(userId);
  await sendMessage(chatId, 'Conversación reiniciada. La memoria de notas se mantiene intacta. ¿En qué estamos?');
}

async function handleMemoria(chatId: number, userId: string): Promise<void> {
  const notes = await getNotes(userId);

  if (notes.length === 0) {
    await sendMessage(chatId, 'Sin notas guardadas aún. Según vayas contándome cosas sobre el negocio, voy guardando lo importante.');
    return;
  }

  let text = `*Memoria de MARCO* (${notes.length} notas)\n\n`;
  const grouped: Record<string, string[]> = {};

  for (const note of notes) {
    if (!grouped[note.category]) grouped[note.category] = [];
    grouped[note.category].push(note.content);
  }

  let i = 1;
  for (const [cat, items] of Object.entries(grouped)) {
    text += `*${cat.toUpperCase()}:*\n`;
    for (const item of items) {
      text += `${i}. ${item}\n`;
      i++;
    }
    text += '\n';
  }

  text += '_Usa /borrar N para eliminar una nota._';
  await sendMessage(chatId, text);
}

async function handleBorrar(chatId: number, userId: string, indexStr: string): Promise<void> {
  const index = parseInt(indexStr, 10) - 1;
  if (isNaN(index) || index < 0) {
    await sendMessage(chatId, 'Usa /borrar seguido del número de la nota. Ejemplo: /borrar 3');
    return;
  }

  const deleted = await deleteNote(userId, index);
  if (deleted) {
    await sendMessage(chatId, `Nota ${index + 1} eliminada.`);
  } else {
    await sendMessage(chatId, `No existe una nota con ese número. Usa /memoria para ver la lista.`);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  // Responder 200 a Telegram inmediatamente para evitar reintentos
  res.status(200).json({ ok: true });

  try {
    const update = req.body;
    const message = update?.message;
    if (!message) return;

    const chatId: number = message.chat.id;
    const userId: string = String(message.from?.id ?? chatId);
    const text: string = (message.text || '').trim();

    // ─── Comandos ───────────────────────────────────────────────────────────
    if (text === '/start') {
      await handleStart(chatId);
      return;
    }

    if (text === '/nuevo') {
      await handleNuevo(chatId, userId);
      return;
    }

    if (text === '/memoria') {
      await handleMemoria(chatId, userId);
      return;
    }

    if (text.startsWith('/borrar')) {
      const parts = text.split(' ');
      await handleBorrar(chatId, userId, parts[1] || '');
      return;
    }

    // ─── Mensaje de texto ────────────────────────────────────────────────────
    if (text) {
      await sendTyping(chatId);
      // Enviar "Analizando..." y obtener su message_id para editarlo después
      const placeholderResult = await tgPost('sendMessage', {
        chat_id: chatId,
        text: '_Analizando..._',
        parse_mode: 'Markdown',
      });
      const placeholderMsgId: number | undefined = placeholderResult.ok
        ? placeholderResult.result?.message_id
        : undefined;

      const reply = await processMessage(userId, text);

      if (placeholderMsgId) {
        await editMessage(chatId, placeholderMsgId, reply);
      } else {
        await sendMessage(chatId, reply);
      }
      return;
    }

    // ─── Foto ────────────────────────────────────────────────────────────────
    if (message.photo) {
      await sendTyping(chatId);
      const placeholderResult = await tgPost('sendMessage', {
        chat_id: chatId,
        text: '_Analizando imagen..._',
        parse_mode: 'Markdown',
      });
      const placeholderMsgId: number | undefined = placeholderResult.ok
        ? placeholderResult.result?.message_id
        : undefined;

      const best = message.photo[message.photo.length - 1];
      const imageUrl = await getFileUrl(best.file_id);
      const caption: string = message.caption || '';
      const reply = await processMessage(userId, caption, imageUrl);

      if (placeholderMsgId) {
        await editMessage(chatId, placeholderMsgId, reply);
      } else {
        await sendMessage(chatId, reply);
      }
      return;
    }

  } catch (error: any) {
    console.error('Error procesando update:', error?.message || error);
  }
}
