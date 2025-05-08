import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";

/**
 * Initialize basic bot commands
 * @param bot The Telegram bot instance
 */
export function initCommands(bot: Bot): void {
  // Start command handler
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("Post Menfess", "post")
      .row()
      .url("Channel", `https://t.me/${botConfig.channelId.replace("@", "")}`);

    await ctx.reply(
      "Welcome to Bulaksumur Menfess Bot! 🎭\n\n" +
        "You can send anonymous messages to our channel.\n" +
        "Use the button below or send /post to create a new menfess.",
      {
        reply_markup: keyboard,
      }
    );
  });

  // Help command handler
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Bulaksumur Menfess Bot Commands:\n\n" +
        "/start - Start the bot and get the main menu\n" +
        `/post - Create a new anonymous post (must include "${botConfig.postTrigger}" in the message)\n` +
        "/cancel - Cancel current operation\n" +
        "/help - Show this help message\n\n" +
        `You can send text, photos, or videos for your menfess posts. All posts must include the word "${botConfig.postTrigger}".\n\n` +
        "All posts will be sent to the channel and duplicated in the group chat where members can interact with them using the provided buttons."
    );
  });
}
