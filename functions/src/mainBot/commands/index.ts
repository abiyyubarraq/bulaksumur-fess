import type { ParseModeFlavor } from "@grammyjs/parse-mode";
import { Bot } from "grammy";
import {
  sendPasteChannelLinkMenu,
  sendPasteGroupLinkMenu,
} from "../../pasteLinkHandler";
import { startPostMenfessListener } from "../../postMenfess";
import { startSendFeedBackListener } from "../../sendFeedback";
import { botConfig } from "../../utils/config";
import type { BotContext } from "../../utils/types";
import {
  sendHelpMenu,
  sendMainMenu,
  sendReportFeedbackMenu,
  sendRulesMenu,
  sendSendAnonMessageMenu,
  sendStartPostMenu,
  sendViewProfileMenu,
} from "./commandMenuContent";

export function initCommands(bot: Bot<ParseModeFlavor<BotContext>>): void {
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

  bot.hears(/^@.+/, async (ctx) => {
    await sendViewProfileMenu(ctx);
  });

  bot.hears(
    new RegExp(`https://t\\.me/${botConfig.channelId.replace("@", "")}/`),
    async (ctx) => {
      await sendPasteChannelLinkMenu(ctx);
    }
  );

  bot.hears(
    new RegExp(`https://t\\.me/${botConfig.groupChatId.replace("@", "")}/`),
    async (ctx) => {
      await sendPasteGroupLinkMenu(ctx);
    }
  );

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

  bot.callbackQuery("send_anon_message", async (ctx) => {
    await sendSendAnonMessageMenu(ctx);
  });

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
