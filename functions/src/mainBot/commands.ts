import { Bot } from "grammy";
import { startPostMenfessListener } from "../postMenfess";
import { startSendFeedBackListener } from "../sendFeedback";
import type { BotContext } from "../utils/types";
import {
  sendHelpMenu,
  sendMainMenu,
  sendReportFeedbackMenu,
  sendRulesMenu,
  sendStartPostMenu,
} from "./commandMenuContent";

/**
 * Initialize basic bot commands
 * @param bot The Telegram bot instance
 */
export function initCommands(bot: Bot<BotContext>): void {
  bot.on("message:entities:bot_command", async (ctx, next) => {
    const receivedCmd = ctx.message.text?.split(" ")[0];
    if (
      receivedCmd &&
      !["menu", "help", "rules"].includes(receivedCmd.substring(1))
    ) {
      await ctx.reply(
        "Command not found. Use /help to see available commands."
      );
      return;
    } else {
      next();
      return;
    }
  });
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

  bot.callbackQuery("back_to_main_menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  // Post Menfess and Send Anon message
  bot.callbackQuery("start_post", async (ctx) => {
    await sendStartPostMenu(ctx);
  });

  bot.callbackQuery("back_to_start_post_menu", async (ctx) => {
    await sendStartPostMenu(ctx);
  });

  bot.callbackQuery("post_menfess", async (ctx) => {
    await startPostMenfessListener(ctx);
  });

  // TODO: Add anon message
  // bot.callbackQuery("post_anon_message", async (ctx) => {
  //   await ctx.answerCallbackQuery();
  //   await ctx.reply(
  //     "Silahkan kirim pesan anonymous kamu (tanpa perlu menambahkan trigger word)."
  //   );
  // });

  // Feedback
  bot.callbackQuery("report_feedback", async (ctx) => {
    await sendReportFeedbackMenu(ctx);
  });

  bot.callbackQuery("back_to_send_feedback_menu", async (ctx) => {
    await sendReportFeedbackMenu(ctx);
  });

  bot.callbackQuery("send_kritik", async (ctx) => {
    await startSendFeedBackListener(ctx, "kritik");
  });

  bot.callbackQuery("send_saran", async (ctx) => {
    await startSendFeedBackListener(ctx, "saran");
  });

  bot.callbackQuery("send_lapor", async (ctx) => {
    await startSendFeedBackListener(ctx, "laporan");
  });
}
