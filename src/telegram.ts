import type { Context } from 'grammy';

export async function getPhotoUrl(ctx: Context, botToken: string): Promise<string | undefined> {
  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) return undefined;

  // Telegram envía varias resoluciones, tomamos la más grande
  const best = photo[photo.length - 1];
  const file = await ctx.api.getFile(best.file_id);
  return `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
}

export async function sendReply(ctx: Context, reply: string) {
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
}
