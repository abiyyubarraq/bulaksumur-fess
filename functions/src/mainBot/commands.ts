import { Bot, InlineKeyboard } from "grammy";
import { startPostMenfessListener } from "../postMenfess";
import { startSendFeedBackListener } from "../sendFeedback";
import { botConfig } from "../utils/config";
import type { BotContext } from "../utils/types";
import {
  sendHelpMenu,
  sendMainMenu,
  sendReportFeedbackMenu,
  sendRulesMenu,
  sendSendAnonMessageMenu,
  sendStartPostMenu,
  sendViewProfileMenu,
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

  bot.hears(/^@.+/, async (ctx) => {
    await sendViewProfileMenu(ctx);
  });

  bot.hears(
    new RegExp(`https://t\\.me/${botConfig.channelId.replace("@", "")}/`),
    async (ctx) => {
      const channelChatId = ctx.update.message?.text?.split("/")[4];
      const userId = ctx.from?.id;
      if (!channelChatId || isNaN(Number(channelChatId))) {
        ctx.reply(
          "❌ Channel chat tidak ditemukan, silahkan cek kembali link channel yang kamu masukkan\n\n" +
            "🔗 Contoh link channel yang benar: https://t.me/usernameChannel/111"
        );
        return;
      }
      if (!userId) {
        return;
      }

      const keyboard = new InlineKeyboard();
      keyboard.text("« BACK", "back_to_main_menu");

      try {
        const data = await fetch(ctx.update.message?.text ?? "", {
          method: "GET",
        });
        const jsonData = await data.text();
        console.log(jsonData);
        // await ctx.api.copyMessage(
        //   userId,
        //   botConfig.channelId,
        //   Number(channelChatId),
        //   {
        //     reply_markup: keyboard,
        //   }
        // );
        ctx.reply("✅ Pesan dari channel berhasil disalin");
      } catch (error) {
        console.error("Error fetching/copying message:", error);
        ctx.reply("❌ Gagal mengambil pesan dari channel");
      }
    }
  );

  // bot.hears(
  //   new RegExp(`https://t\\.me/${botConfig.groupChatId.replace("@", "")}/`),
  //   async (ctx) => {
  //     const groupChatId = ctx.update.message?.text?.split("/")[4];
  //     if (!groupChatId || isNaN(Number(groupChatId))) {
  //       ctx.reply(
  //         "❌ Group chat tidak ditemukan, silahkan cek kembali link grup yang kamu masukkan\n\n" +
  //           "🔗 Contoh link grup yang benar: https://t.me/usernameGroup/111"
  //       );
  //       return;
  //     }

  //     const keyboard = new InlineKeyboard();
  //     keyboard.text("« BACK", "back_to_main_menu");

  //     try {
  //       // Direct fetch to Telegram API
  //       const token = botConfig.botToken;
  //       const url = `https://api.telegram.org/bot${token}/channels.getMessages`;

  //       const response = await fetch(url, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           channel: {
  //             _: "inputChannel",
  //             channel_id: botConfig.groupChatId.replace("@", ""),
  //             access_hash: 0,
  //           },
  //           id: [
  //             {
  //               _: "inputMessageID",
  //               id: Number(groupChatId),
  //             },
  //           ],
  //         }),
  //       });

  //       const data = await response.json();
  //       console.log(data);

  //       // Fallback to copyMessage if needed
  //       const copiedMessage = await ctx.api.copyMessage(
  //         ctx.from?.id || 0,
  //         botConfig.groupChatId,
  //         Number(groupChatId),
  //         {
  //           reply_markup: keyboard,
  //         }
  //       );
  //       ctx.reply("✅ Pesan dari grup berhasil disalin");
  //     } catch (error) {
  //       console.error("Error fetching/copying message:", error);
  //       ctx.reply("❌ Gagal mengambil pesan dari grup");
  //     }
  //   }
  // );

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
