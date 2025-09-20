import { type Bot, InlineKeyboard } from "grammy";
import * as mt from "moment-timezone";
import { db } from "../utils/firebase";
import {
  getGenderEmoji,
  isValidMessage,
  sanitizeMessage,
} from "../utils/helpers";
import { GoldRate } from "../utils/premium.helpers";
import type { BotContext } from "../utils/types";

const moment = mt.tz.setDefault("Asia/Jakarta");
const usersInAnonMessageMode = new Map<
  number,
  {
    targetUserId: number;
    targetUsername: string;
    isRevealReceiver: boolean;
    isReply: boolean;
    messagePreview: string;
  }
>();
const userInReportingUserMode = new Map<
  number,
  { targetUserId: number; targetUsername: string }
>();
let lastBotMessageId: number | null = null;

const waitingReportMessage = (targetUsername: string) =>
  `🚨 Silahkan balas dengan laporan kamu terkait pengguna @${targetUsername}!\n\n` +
  "🦊 Dilarang mengirim link selain dari t.me channel/group dan dilarang mengirim username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 15 karakter, dan maksimal 888 karakter yyaa)";

const waitingAnonMessage = () =>
  `✉️ Silahkan balas dengan pesan anonim yang ingin kamu kirimkan!\n\n` +
  "🦊 Dilarang mengirim link selain dari t.me channel/group dan dilarang mengirim username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 10 karakter, dan maksimal 888 karakter yyaa)";

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

  bot.callbackQuery(/^user_report_(\d+)_([a-zA-Z0-9]+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[1]);
    const targetUsername = ctx.match[2]?.toLowerCase() || "";

    ctx.session.route = "report_user";
    userInReportingUserMode.set(ctx.from.id, {
      targetUserId: targetUserId,
      targetUsername: targetUsername.toLowerCase(),
    });

    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_report_user"
    );

    await ctx.editMessageText("....");
    const botMessage = await ctx.reply(waitingReportMessage(targetUsername), {
      reply_markup: cancelKeyboard,
    });
    lastBotMessageId = (botMessage as { message_id: number }).message_id;
  });

  bot.callbackQuery(
    /^anon_mess_(\d+)_([a-zA-Z0-9]+)_(true|false)_(true|false)(?:_(.*))?$/,
    async (ctx) => {
      if (ctx.session.dailyGoldQuota < GoldRate.ANON_MESSAGE) {
        await ctx.editMessageText("...");
        await ctx.reply(
          "🥲 Ups! Goldmu tidak cukup, silahkan upgrade ke premium untuk mendapatkan gold lebih banyak! 🪙"
        );
        return;
      }
      const targetUserId = Number(ctx.match[1]);
      if (targetUserId === ctx.from.id) {
        await ctx.editMessageText("...");
        await ctx.reply(
          "😟 Waduh! Kamu tidak bisa mengirim pesan anonim ke dirimu sendiri!"
        );
        return;
      }
      const targetUsername = ctx.match[2]?.toLowerCase() || "";
      const isRevealReceiver = ctx.match[3] === "true";
      const isReply = ctx.match[4] === "true";
      const messagePreview = ctx.match[5] || "";

      ctx.session.route = "anon_message_mode";
      usersInAnonMessageMode.set(ctx.from.id, {
        targetUserId: targetUserId,
        targetUsername: targetUsername.toLowerCase(),
        isRevealReceiver: isRevealReceiver,
        isReply: isReply,
        messagePreview: messagePreview,
      });

      const cancelKeyboard = new InlineKeyboard().text(
        "✖️ Cancel",
        "cancel_anon_message"
      );

      await ctx.editMessageText("....");
      const botMessage = await ctx.reply(waitingAnonMessage(), {
        reply_markup: cancelKeyboard,
      });
      lastBotMessageId = (botMessage as { message_id: number }).message_id;
    }
  );

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

  bot.callbackQuery(/^unsend_anon_mess_(\d+)_(\d+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[1]);
    const messageId = Number(ctx.match[2]);
    await ctx.api.deleteMessage(targetUserId, messageId);

    await ctx.editMessageText(`😶 Kamu berhasil menghapus pesan anonim.`);
  });

  bot.on("message:text", async (ctx, next) => {
    if (
      ctx.from &&
      usersInAnonMessageMode.has(ctx.from.id) &&
      ctx.session.route === "anon_message_mode"
    ) {
      if (lastBotMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id || 0, lastBotMessageId);
      }
      const {
        targetUserId,
        targetUsername,
        isRevealReceiver,
        isReply,
        messagePreview,
      } = usersInAnonMessageMode.get(ctx.from.id) || {
        targetUserId: null,
        targetUsername: null,
        isRevealReceiver: false,
        isReply: false,
        messagePreview: "",
      };
      const messageText = ctx.message.text;

      if (!targetUserId || !targetUsername) {
        await ctx.reply("😔 User tidak ditemukan.");
        ctx.session.route = "idle";
        usersInAnonMessageMode.delete(ctx.from.id);
        return;
      }

      if (!isValidMessage(messageText, 10)) {
        const cancelKeyboard = new InlineKeyboard().text(
          "✖️ Cancel",
          "cancel_anon_message"
        );
        const lastReply = await ctx.reply(waitingAnonMessage(), {
          reply_markup: cancelKeyboard,
        });
        lastBotMessageId = (lastReply as { message_id: number }).message_id;
        return;
      }

      const senderUsername = ctx.from.username?.toLowerCase();
      const senderId = ctx.from.id;

      const formattedMessage = `🔹 Hallooo @${targetUsername} 👋\n\n ${messagePreview ? `💥 Pesan kamu:\n\n❝${messagePreview}...❞\n\n` : ""}📨 Kamu mendapat ${isReply ? "balasan" : "kiriman"} pesan anonim ✨\n\n💌 Pesan:\n\n❝${messageText}❞\n\n${getGenderEmoji(ctx.session.gender)}`;

      const targetKeyboard = new InlineKeyboard().text(
        "🔁 Reply",
        `anon_mess_${senderId}_${senderUsername}_false_true_${messageText.slice(0, 15)}`
      );
      const sentMessage = await ctx.api.sendMessage(
        targetUserId,
        formattedMessage,
        { reply_markup: targetKeyboard, parse_mode: "HTML" }
      );

      const keyboard = new InlineKeyboard().text(
        "✖️ Unsend",
        `unsend_anon_mess_${targetUserId}_${(sentMessage as { message_id: number }).message_id}`
      );
      const text = isReply
        ? "📨 Balasan pesan anonim kamu telah berhasil dikirim!"
        : `📤 Pesan anonim kamu telah berhasil dikirim${isRevealReceiver ? ` ke @${targetUsername}` : ""}!`;
      await ctx.reply(text, {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: keyboard,
      });
      ctx.session.route = "idle";
      usersInAnonMessageMode.delete(ctx.from.id);
      ctx.session.dailyGoldQuota =
        ctx.session.dailyGoldQuota - GoldRate.ANON_MESSAGE;
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
      if (!isValidMessage(messageText, 15)) {
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
        reporterUsername: ctx.from.username?.toLowerCase() || "",
        reportText: sanitizeMessage(messageText),
        userId: targetUserId,
        userName: targetUsername,
        createdAt: moment().toDate(),
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
