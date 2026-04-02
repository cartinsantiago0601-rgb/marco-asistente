import { Bot } from 'grammy';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processMessage } from '../src/agent.js';
import { getPhotoUrl, sendReply } from '../src/telegram.js';

const token = process.env.TELEGRAM_BOT_TOKEN!;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');

const bot = new Bot(token);

const allowedIds = (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !isNaN(id));

function isAllowed(userId: number): boolean {
  return allowedIds.length === 0 || allowedIds.includes(userId);
}

bot.command('start', async (ctx) => {
  await ctx.reply('MARCO activo. Dispara.');
});

bot.on('message:text', async (ctx) => {
  if (!isAllowed(ctx.from.id)) return ctx.reply('No tienes acceso a este bot.');
  await ctx.replyWithChatAction('typing');
  const reply = await processMessage(ctx.from.id.toString(), ctx.message.text);
  await sendReply(ctx, reply);
});

bot.on('message:photo', async (ctx) => {
  if (!isAllowed(ctx.from.id)) return ctx.reply('No tienes acceso a este bot.');
  await ctx.replyWithChatAction('typing');
  const imageUrl = await getPhotoUrl(ctx, token);
  const caption = ctx.message.caption || '';
  const reply = await processMessage(ctx.from.id.toString(), caption, imageUrl);
  await sendReply(ctx, reply);
});

bot.catch((err) => {
  console.error('Error en el bot:', err.error);
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(200).json({ ok: true });
    }
  } else {
    res.status(200).json({ ok: true });
  }
}
