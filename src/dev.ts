import { Bot } from 'grammy';
import { config, ALLOWED_USER_IDS } from './config.js';
import { processMessage } from './agent.js';
import { getPhotoUrl, sendReply } from './telegram.js';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

function isAllowed(userId: number): boolean {
  return ALLOWED_USER_IDS.length === 0 || ALLOWED_USER_IDS.includes(userId);
}

bot.command('start', async (ctx) => {
  await ctx.reply('MARCO activo (dev). Dispara.');
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
  const imageUrl = await getPhotoUrl(ctx, config.TELEGRAM_BOT_TOKEN);
  const caption = ctx.message.caption || '';
  const reply = await processMessage(ctx.from.id.toString(), caption, imageUrl);
  await sendReply(ctx, reply);
});

bot.catch((err) => {
  console.error('Error:', err.error);
});

console.log('MARCO dev — iniciando long polling...');
bot.start({
  onStart: (info) => console.log(`Bot conectado como @${info.username}`),
});
