import { type Bot, InlineKeyboard } from "grammy";
import { db } from "../utils/firebase";
import { sanitizeMessage } from "../utils/helpers";
import type { BotContext } from "../utils/types";

const usersInAnonMessageMode = new Map<
  number,
  { targetUserId: number; targetUsername: string }
>();
const userInReportingUserMode = new Map<
  number,
  { targetUserId: number; targetUsername: string }
>();
let lastBotMessageId: number | null = null;

export function initViewUserProfile(bot: Bot<BotContext>): void {
  // bot.callbackQuery(/^user_(\d+)_block_(\d+)$/, async (ctx) => {
  //   const targetUserId = ctx.match[1];
  //   await ctx.answerCallbackQuery({
  //     text: `User with ID ${targetUserId} has been blocked.`,
  //     show_alert: true,
  //   });
  //   // Remove the reply markup
  //   await ctx.editMessageReplyMarkup({
  //     reply_markup: { inline_keyboard: [] },
  //   });
  // });

  bot.callbackQuery(/^user_(\d+)_report_(\d+)_(\w+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[2]);
    const targetUsername = ctx.match[3] || "";

    if (ctx.from) {
      userInReportingUserMode.set(ctx.from.id, {
        targetUserId: targetUserId,
        targetUsername: targetUsername,
      });
    }

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_report_user"
    );

    const botMessage = await ctx.editMessageText(
      `🚨 Silahkan balas pesan ini dengan laporan kamu terkait pengguna @${targetUsername}!\n\n`,
      {
        reply_markup: cancelKeyboard,
      }
    );
    lastBotMessageId = (botMessage as { message_id: number }).message_id;
  });

  bot.callbackQuery(/^user_(\d+)_send_anon_to_(\d+)_(\w+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[2]);
    const targetUsername = ctx.match[3] || "";

    if (ctx.from) {
      usersInAnonMessageMode.set(ctx.from.id, {
        targetUserId: targetUserId,
        targetUsername: targetUsername,
      });

      if (ctx.session) {
        ctx.session.lastSentInteract = new Date();
      }
    }

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_anon_message"
    );

    const botMessage = await ctx.editMessageText(
      `✉️ Silahkan balas pesan ini dengan pesan anonim yang ingin kamu kirimkan ke @${targetUsername}!\n\n`,
      {
        reply_markup: cancelKeyboard,
      }
    );
    lastBotMessageId = (botMessage as { message_id: number }).message_id;
  });

  bot.callbackQuery("cancel_anon_message", async (ctx) => {
    if (ctx.from) {
      usersInAnonMessageMode.delete(ctx.from.id);
    }

    await ctx.editMessageText("Kamu membatalkan pengiriman pesan anonim.");
  });

  bot.callbackQuery("cancel_report_user", async (ctx) => {
    if (ctx.from) {
      userInReportingUserMode.delete(ctx.from.id);
    }

    await ctx.editMessageText("Kamu membatalkan mengirim laporan.");
  });

  bot.on("message:text", async (ctx, next) => {
    if (ctx.from && usersInAnonMessageMode.has(ctx.from.id)) {
      if (lastBotMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id || 0, lastBotMessageId);
      }
      const { targetUserId, targetUsername } = usersInAnonMessageMode.get(
        ctx.from.id
      ) || {
        targetUserId: null,
        targetUsername: null,
      };
      const messageText = ctx.message.text;

      if (!targetUserId || !targetUsername) {
        await ctx.reply("🚫 User tidak ditemukan.");
        return;
      }

      const formattedMessage = `🔹 Hello @${targetUsername} 👋\n\n📨 Kamu mendapat kiriman pesan anonim ✨\n\n💌 Pesan:\n\n❝${messageText}❞`;

      await ctx.api.sendMessage(targetUserId, formattedMessage);

      await ctx.reply(
        `✅ Pesan anonim kamu telah berhasil dikirim ke @${targetUsername}!`
      );

      if (ctx.from) {
        usersInAnonMessageMode.delete(ctx.from.id);
      }

      return;
    }
    if (ctx.from && userInReportingUserMode.has(ctx.from.id)) {
      if (lastBotMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id || 0, lastBotMessageId);
      }
      const { targetUserId, targetUsername } = userInReportingUserMode.get(
        ctx.from.id
      ) || {
        targetUserId: null,
        targetUsername: null,
      };
      const messageText = ctx.message.text;
      if (!targetUserId || !targetUsername) {
        await ctx.reply("🚫 User tidak ditemukan.");
        return;
      }

      await db.collection(`user/${ctx.from.id}/reports`).add({
        reporterId: ctx.from.id,
        reporterUsername: ctx.from.username,
        reportText: sanitizeMessage(messageText),
        userId: targetUserId,
        userName: targetUsername,
        createdAt: new Date(),
        isFromMenfess: false,
        isRead: false,
      });

      await ctx.reply(
        `🚨 Laporan terkait pengguna @${targetUsername} telah berhasil dikirim ke admin.`
      );

      if (ctx.from) {
        userInReportingUserMode.delete(ctx.from.id);
      }

      return;
    }
    await next();
    return;
  });
}
