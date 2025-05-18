import type { ParseModeFlavor } from "@grammyjs/parse-mode";
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

export function initViewUserProfile(
  bot: Bot<ParseModeFlavor<BotContext>>
): void {
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
      `🚨 Silahkan balas dengan laporan kamu terkait pengguna @${targetUsername}!\n\n`,
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

      ctx.session.lastSentInteract = new Date();
    }

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_anon_message"
    );

    const botMessage = await ctx.editMessageText(
      `✉️ Silahkan balas dengan pesan anonim yang ingin kamu kirimkan ke @${targetUsername}!\n\n`,
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

  bot.callbackQuery(
    /^unsend_anon_message_to_(\d+)_(\d+)_(\d+)$/,
    async (ctx) => {
      const targetUsername = ctx.match[1];
      const targetUserId = Number(ctx.match[2]);
      const messageId = Number(ctx.match[3]);

      await ctx.api.deleteMessage(targetUserId, messageId);

      await ctx.editMessageText(
        `😶 Kamu berhasil menghapus pesan anonim ke @${targetUsername}.`
      );
    }
  );

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
        await ctx.reply("😔 User tidak ditemukan.");
        return;
      }

      const formattedMessage = `🔹 Hello @${targetUsername} 👋\n\n📨 Kamu mendapat kiriman pesan anonim ✨\n\n💌 Pesan:\n\n❝${messageText}❞\n\n${ctx.session.gender === "M" ? "🕺 #M✘✘" : "💃 #F✘✘"}`;

      const sentMessage = await ctx.api.sendMessage(
        targetUserId,
        formattedMessage
      );

      const keyboard = new InlineKeyboard().text(
        "✖️ Unsend",
        `unsend_anon_message_to_${targetUsername}_${targetUserId}_${(sentMessage as { message_id: number }).message_id}`
      );
      await ctx.reply(
        `📤 Pesan anonim kamu telah berhasil dikirim ke @${targetUsername}!`,
        {
          reply_markup: keyboard,
        }
      );

      usersInAnonMessageMode.delete(ctx.from.id);
    } else if (ctx.from && userInReportingUserMode.has(ctx.from.id)) {
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
        await ctx.reply("😔 User tidak ditemukan.");
        return;
      }

      await db.collection(`users/${ctx.from.id}/reports`).add({
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

      userInReportingUserMode.delete(ctx.from.id);
      return;
    }
    await next();
    return;
  });
}
