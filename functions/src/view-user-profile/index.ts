import { type Bot, InlineKeyboard } from "grammy";
import { db } from "../utils/firebase";
import { isValidMessage, sanitizeMessage } from "../utils/helpers";
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

const waitingReportMessage = (targetUsername: string) =>
  `🚨 Silahkan balas dengan laporan kamu terkait pengguna @${targetUsername}!\n\n` +
  "🦊 Dilarang mengirim link atau username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 32 karakter, dan maksimal 888 karakter yyaa)";

const waitingAnonMessage = (targetUsername: string) =>
  `✉️ Silahkan balas dengan pesan anonim yang ingin kamu kirimkan ke @${targetUsername}!\n\n` +
  "🦊 Dilarang mengirim link atau username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 15 karakter, dan maksimal 888 karakter yyaa)";

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

    ctx.session.route = "report_user";
    userInReportingUserMode.set(ctx.from.id, {
      targetUserId: targetUserId,
      targetUsername: targetUsername,
    });

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_report_user"
    );

    const botMessage = await ctx.editMessageText(
      waitingReportMessage(targetUsername),
      {
        reply_markup: cancelKeyboard,
      }
    );
    lastBotMessageId = (botMessage as { message_id: number }).message_id;
  });

  bot.callbackQuery(/^user_(\d+)_send_anon_to_(\d+)_(\w+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[2]);
    const targetUsername = ctx.match[3] || "";

    ctx.session.route = "anon_message_mode";
    usersInAnonMessageMode.set(ctx.from.id, {
      targetUserId: targetUserId,
      targetUsername: targetUsername,
    });

    ctx.session.lastSentInteract = new Date();

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_anon_message"
    );

    const botMessage = await ctx.editMessageText(
      waitingAnonMessage(targetUsername),
      {
        reply_markup: cancelKeyboard,
      }
    );
    lastBotMessageId = (botMessage as { message_id: number }).message_id;
  });

  bot.callbackQuery("cancel_anon_message", async (ctx) => {
    ctx.session.route = "idle";
    usersInAnonMessageMode.delete(ctx.from.id);

    await ctx.editMessageText("Kamu membatalkan pengiriman pesan anonim.");
  });

  bot.callbackQuery("cancel_report_user", async (ctx) => {
    ctx.session.route = "idle";
    userInReportingUserMode.delete(ctx.from.id);

    await ctx.editMessageText("Kamu membatalkan mengirim laporan.");
  });

  bot.callbackQuery(
    /^unsend_anon_message_to_(\w+)_(\d+)_(\d+)$/,
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
    if (
      ctx.from &&
      usersInAnonMessageMode.has(ctx.from.id) &&
      ctx.session.route === "anon_message_mode"
    ) {
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
        ctx.session.route = "idle";
        usersInAnonMessageMode.delete(ctx.from.id);
        return;
      }

      if (!isValidMessage(messageText, 15)) {
        const cancelKeyboard = new InlineKeyboard().text(
          "✖️ Cancel",
          "cancel_anon_message"
        );
        const lastReply = await ctx.reply(waitingAnonMessage(targetUsername), {
          reply_markup: cancelKeyboard,
        });
        lastBotMessageId = (lastReply as { message_id: number }).message_id;
        return;
      }

      const formattedMessage = `🔹 Hello @${targetUsername} 👋\n\n📨 Kamu mendapat kiriman pesan anonim ✨\n\n💌 Pesan:\n\n❝${messageText}❞\n\n${ctx.session.gender === "M" ? "🕺 #M✘✘" : "💃 #F✘✘"}`;

      const sentMessage = await ctx.api.sendMessage(
        targetUserId,
        formattedMessage,
        { parse_mode: "HTML" }
      );

      const keyboard = new InlineKeyboard().text(
        "✖️ Unsend",
        `unsend_anon_message_to_${targetUsername}_${targetUserId}_${(sentMessage as { message_id: number }).message_id}`
      );
      await ctx.reply(
        `📤 Pesan anonim kamu telah berhasil dikirim ke @${targetUsername}!`,
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: keyboard,
        }
      );
      ctx.session.route = "idle";
      usersInAnonMessageMode.delete(ctx.from.id);
    } else if (
      ctx.from &&
      userInReportingUserMode.has(ctx.from.id) &&
      ctx.session.route === "report_user"
    ) {
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
        ctx.session.route = "idle";
        return;
      }
      if (!isValidMessage(messageText)) {
        const cancelKeyboard = new InlineKeyboard().text(
          "✖️ Cancel",
          "cancel_report_user"
        );
        const lastReply = await ctx.reply(
          waitingReportMessage(targetUsername),
          {
            reply_markup: cancelKeyboard,
          }
        );
        lastBotMessageId = (lastReply as { message_id: number }).message_id;
        return;
      }

      await db.collection(`users/${targetUserId}/reports`).add({
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
        `🚨 Laporan terkait pengguna @${targetUsername} telah berhasil dikirim ke admin.`,
        {
          reply_to_message_id: ctx.message.message_id,
        }
      );

      ctx.session.route = "idle";
      userInReportingUserMode.delete(ctx.from.id);
      return;
    }
    await next();
    return;
  });
}
