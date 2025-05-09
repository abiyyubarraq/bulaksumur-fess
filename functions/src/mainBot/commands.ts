import { Bot } from "grammy";
import { handlePostCommand } from "../postMenfess/handlers";
import type { BotContext } from "../utils/types";
import {
  sendHelpMenu,
  sendMainMenu,
  sendRulesMenu,
  sendStartPostMenu,
} from "./commandMenuContent";

/**
 * Initialize basic bot commands
 * @param bot The Telegram bot instance
 */
export function initCommands(bot: Bot<BotContext>): void {
  // Init Command
  bot.command("help", async (ctx) => {
    await sendHelpMenu(ctx);
  });

  bot.command("menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  bot.command("rules", async (ctx) => {
    await sendRulesMenu(ctx);
  });

  // Init Callback Query
  bot.callbackQuery("back_to_main_menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  bot.callbackQuery("start_post", async (ctx) => {
    await sendStartPostMenu(ctx);
  });

  bot.callbackQuery("back_to_start_post_menu", async (ctx) => {
    await sendStartPostMenu(ctx);
  });

  bot.callbackQuery("post_menfess", async (ctx) => {
    await handlePostCommand(ctx);
  });

  bot.callbackQuery("post_anon_message", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "Silahkan kirim pesan anonymous kamu (tanpa perlu menambahkan trigger word)."
    );
  });
}
