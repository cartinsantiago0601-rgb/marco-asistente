import { Bot } from 'grammy';
import { config } from './config.js';
import { processMessage } from './agent.js';
import { ALLOWED_USER_IDS } from './config.js';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.command('start', async (ctx) => {
  await ctx.reply('MARCO activo (dev). Dispara.');
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;

  if (ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(userId)) {
    await ctx.reply('No tienes acceso a este bot.');
    return;
  }

  await ctx.replyWithChatAction('typing');

  const reply = await processMessage(userId.toString(), ctx.message.text);

  if (reply.length <= 4096) {
    try {
      await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(reply);
    }
  } else {
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
  console.error('Error:', err.error);
});

console.log('MARCO dev — iniciando long polling...');
bot.start({
  onStart: (info) => console.log(`Bot conectado como @${info.username}`),
});
