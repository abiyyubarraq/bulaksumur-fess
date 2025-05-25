import { Bot } from "grammy";
import {
  sendPasteChannelCommentLinkMenu,
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
  viewMyProfileMenu,
} from "./commandMenuContent";

export function initCommands(bot: Bot<BotContext>): void {
  bot.hears(/^@.+/, async (ctx) => {
    await sendViewProfileMenu(ctx);
  });

  bot.hears(
    new RegExp(`https://t\\.me/${botConfig.channelId.replace("@", "")}/\\d+$`),
    async (ctx) => {
      ctx.session.route = "idle";
      await sendPasteChannelLinkMenu(ctx);
    }
  );

  bot.hears(
    new RegExp(
      `https://t\\.me/${botConfig.groupChatId.replace("@", "")}/\\d+$`
    ),
    async (ctx) => {
      ctx.session.route = "idle";
      await sendPasteGroupLinkMenu(ctx);
    }
  );

  bot.hears(
    new RegExp(
      `https://t\\.me/${botConfig.channelId.replace("@", "")}/(\\d+)(\\?comment=(\\d+))?$`
    ),
    async (ctx) => {
      ctx.session.route = "idle";
      await sendPasteChannelCommentLinkMenu(ctx);
    }
  );

  bot.on("message:entities:bot_command", async (ctx, next) => {
    const receivedCmd = ctx.message.text?.split(" ")[0];
    if (
      receivedCmd &&
      !["menu", "help", "rules"].includes(receivedCmd.substring(1))
    ) {
      await ctx.reply(
        "⚠️ Perintah tidak ditemukan. Gunakan /help untuk melihat perintah yang tersedia."
      );
      return;
    } else {
      ctx.session.route = "idle";
      await next();
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

  bot.callbackQuery("view_rules", async (ctx) => {
    await ctx.editMessageText("...");
    await sendRulesMenu(ctx);
  });

  bot.callbackQuery("back_to_main_menu", async (ctx) => {
    await sendMainMenu(ctx, true);
  });

  bot.callbackQuery("view_my_profile", async (ctx) => {
    await viewMyProfileMenu(ctx);
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
    ctx.session.route = "idle";
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
