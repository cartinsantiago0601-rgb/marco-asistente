import { Bot } from 'grammy';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processMessage } from '../src/agent.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');

const bot = new Bot(token);

// IDs permitidos (solo Santiago)
const allowedIds = (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !isNaN(id));

bot.command('start', async (ctx) => {
  await ctx.reply('MARCO activo. Dispara.');
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;

  // Si hay whitelist, verificar acceso
  if (allowedIds.length > 0 && !allowedIds.includes(userId)) {
    await ctx.reply('No tienes acceso a este bot.');
    return;
  }

  await ctx.replyWithChatAction('typing');

  const reply = await processMessage(userId.toString(), ctx.message.text);

  // Telegram tiene límite de 4096 caracteres por mensaje
  if (reply.length <= 4096) {
    try {
      await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(reply);
    }
  } else {
    // Partir en chunks
    const chunks = reply.match(/[\s\S]{1,4096}/g) || [reply];
    for (const chunk of chunks) {
      try {
        await ctx.reply(chunk, { parse_mode: 'Markdown' });
      } catch {
        await ctx.reply(chunk);
      }
    }
  }
});

bot.catch((err) => {
  console.error('Error en el bot:', err.error);
});

// Handler para Vercel serverless
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      await bot.handleUpdate(update);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(200).json({ ok: true });
    }
  } else {
    res.status(200).json({ ok: true });
  }
}
