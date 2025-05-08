import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { isUserRegistered } from "../utils/services";

/**
 * Initialize basic bot commands
 * @param bot The Telegram bot instance
 */
export function initCommands(bot: Bot): void {
  bot.api.setMyCommands([
    {
      command: "/menu",
      description: "Menu Bot",
    },
    {
      command: "/help",
      description: "Bantuan Penggunaan Bot",
    },
    {
      command: "/rule",
      description: "Peraturan Base",
    },
  ]);

  bot.command("menu", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Check if user is registered
    const isRegistered = await isUserRegistered(userId);
    const keyboard = new InlineKeyboard();

    if (isRegistered) {
      keyboard
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
    } else {
      keyboard
        .text("Register Now", "start_registration")
        .row()
        .url("Channel", `https://t.me/${botConfig.channelId.replace("@", "")}`);

      await ctx.reply(
        "Welcome to Bulaksumur Menfess Bot! 🎭\n\n" +
          "You need to register before you can send anonymous messages.\n" +
          "Please click the Register Now button to begin.",
        {
          reply_markup: keyboard,
        }
      );
    }
  });

  bot.command("help", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Check if user is registered
    const isRegistered = await isUserRegistered(userId);

    let registrationText = "";
    if (!isRegistered) {
      registrationText =
        "/register - Register as a user to access all features\n";
    }

    await ctx.reply(
      "Bulaksumur Menfess Bot Commands:\n\n" +
        "/start - Start the bot and get the main menu\n" +
        `/post - Create a new anonymous post (must include "${botConfig.postTrigger}" in the message)\n` +
        "/cancel - Cancel current operation\n" +
        registrationText +
        "/profile - View your user profile\n" +
        "/help - Show this help message\n\n" +
        `You can send text, or photos for your menfess posts. All posts must include the word "${botConfig.postTrigger}".\n\n` +
        "All posts will be sent to the channel and duplicated in the group chat where members can interact with them using the provided buttons."
    );
  });
}
