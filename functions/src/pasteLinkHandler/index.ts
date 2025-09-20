import { Bot, InlineKeyboard } from "grammy";
import * as mt from "moment-timezone";
import {
  getMenfessText,
  handleMaxInteractionsReached,
  updateInteractUsers,
} from "../interactions";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  extractMenfessUID,
  getAgeAndGender,
  getFooterMessage,
  isValidMessage,
  sliceMenfessText,
} from "../utils/helpers";
import { GoldRate } from "../utils/premium.helpers";
import type {
  AnonReplyDbData,
  BotContext,
  MenfessDbData,
} from "../utils/types";

const moment = mt.tz.setDefault("Asia/Jakarta");
const userInAnonReplyMode = new Map<
  number,
  {
    groupChatId: number;
    senderInfo: string;
    messageShoudlDeleted: number | undefined;
  }
>();

const userInInteractionPlusMode = new Map<
  number,
  {
    senderInfo: string;
    messageShoudlDeleted: number | undefined;
    action: string;
    menfessDbData: MenfessDbData;
    menfessOnGroupText: string;
    interactorUserName: string;
    menfessUID: string;
    channelChatId: string;
  }
>();

const waitingAnonReplyMessage =
  "🔮 Silahkan balas dengan reply anonim yang ingin kamu kirim\n\n" +
  "🦊 Dilarang mengirim link selain dari t.me channel/group dan dilarang mengirim username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 15 karakter, dan maksimal 888 karakter yyaa)";

const waitingInteractionPlusMessage =
  "🔮 Silahkan Balas dengan isi pesan untuk Interaksi ✚ Kamu\n\n" +
  "🦊 Dilarang mengirim link selain dari t.me channel/group dan dilarang mengirim username, dan hanya boleh mengirim text dengan character ASCII\n" +
  "🎭 (Minimal 15 karakter, dan maksimal 888 karakter yyaa)";

const validateIds = (
  ctx: BotContext,
  chatId: string | undefined,
  errorMessage: string
): {
  isValid: boolean;
  userId: number | undefined;
  messageId: number | undefined;
} => {
  const userId = ctx.from?.id;
  if (!userId) {
    return { isValid: false, userId: undefined, messageId: undefined };
  }

  if (!chatId || isNaN(Number(chatId))) {
    ctx.reply(errorMessage);
    return { isValid: false, userId, messageId: undefined };
  }

  const messageId = ctx.message?.message_id;
  return { isValid: true, userId, messageId };
};

const sendReplyWithKeyboard = async (
  ctx: BotContext,
  userId: number,
  sourceId: string,
  targetId: number,
  messageId: number | undefined,
  isChannel: boolean
) => {
  const keyboard = new InlineKeyboard();
  const premiumStatus = ctx.session.premiumStatus;

  const callbackPrefix = isChannel
    ? "send_anon_reply_to_channel_"
    : "send_anon_reply_to_group_";
  if (premiumStatus && premiumStatus > 1 && isChannel) {
    keyboard
      .text("👊 Hit Me! ✚", `hitme_plus_${sourceId}`)
      .text("🕵️ Who? ✚", `who_plus_${sourceId}`)
      .text("💬 Talk! ✚", `talk_plus_${sourceId}`)
      .row()
      .text("🥷 Anon Reply", `${callbackPrefix}${sourceId}`);
  } else {
    const anonReplyDbData = await db
      .collection("anonReply")
      .doc(String(targetId))
      .get()
      .then((doc) => doc.data() as AnonReplyDbData | undefined);

    if (anonReplyDbData) {
      keyboard
        .text("🥷 Anon Reply", `${callbackPrefix}${sourceId}`)
        .text(
          "📨 Anon Message",
          `anon_mess_${anonReplyDbData.senderId}_${anonReplyDbData.senderUsername}_false_true_${anonReplyDbData.messagePreview?.slice(0, 15) || ""}`
        )
        .row();
    } else {
      keyboard.text("🥷 Anon Reply", `${callbackPrefix}${sourceId}`);
      // .text("‼️Report", `report_menfess_${isChannel ? "channel" : "group"}_${sourceId}`)
    }
  }

  await ctx.api.copyMessage(
    userId,
    isChannel ? botConfig.channelId : botConfig.groupChatId,
    targetId,
    {
      reply_markup: keyboard,
      reply_to_message_id: messageId,
      parse_mode: "HTML",
    }
  );
};

export async function sendPasteChannelLinkMenu(ctx: BotContext) {
  const channelChatId = ctx.update.message?.text?.split("/")[4];
  const { isValid, userId, messageId } = validateIds(
    ctx,
    channelChatId,
    "❌ Channel chat tidak ditemukan, silahkan cek kembali link channel yang kamu masukkan\n\n" +
      "🔗 Contoh link channel yang benar: https://t.me/usernameChannel/111"
  );

  if (!isValid || !userId) return;

  await sendReplyWithKeyboard(
    ctx,
    userId,
    channelChatId as string,
    Number(channelChatId),
    messageId,
    true
  );
}

export async function sendPasteGroupLinkMenu(ctx: BotContext) {
  const groupChatId = ctx.update.message?.text?.split("/")[4];
  const { isValid, userId, messageId } = validateIds(
    ctx,
    groupChatId,
    "❌ Group chat tidak ditemukan, silahkan cek kembali link grup yang kamu masukkan\n\n" +
      "🔗 Contoh link grup yang benar: https://t.me/usernameGroup/111"
  );

  if (!isValid || !userId) return;

  await sendReplyWithKeyboard(
    ctx,
    userId,
    groupChatId as string,
    Number(groupChatId),
    messageId,
    false
  );
}

export async function sendPasteChannelCommentLinkMenu(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const messageText =
    ctx.update.message?.text || ctx.update.message?.caption || "";
  let groupChatId: string | null = null;
  const commentMatch = messageText.match(/comment=(\d+)/);
  if (commentMatch && commentMatch[1]) {
    groupChatId = commentMatch[1];
  }

  const { isValid, messageId } = validateIds(
    ctx,
    groupChatId || undefined,
    "❌ Chat tidak ditemukan, silahkan cek kembali link yang kamu masukkan\n\n" +
      "🔗 Contoh link yang benar: https://t.me/usernameChannel/111?comment=222"
  );

  if (!isValid) return;

  await sendReplyWithKeyboard(
    ctx,
    userId,
    groupChatId as string,
    Number(groupChatId),
    messageId,
    false
  );
}

const handleValidationErrors = async (
  ctx: BotContext,
  userId: number | undefined,
  chatId: string | undefined,
  isValidChatId: boolean
): Promise<boolean> => {
  if (!userId) {
    await ctx.editMessageText("...");
    await ctx.reply("❌ User tidak ditemukan");
    return false;
  }

  if (!isValidChatId) {
    await ctx.editMessageText("...");
    await ctx.reply("❌ Group chat tidak ditemukan");
    return false;
  }

  if (!chatId) {
    await ctx.editMessageText("...");
    await ctx.reply("❌ Chat tidak ditemukan");
    return false;
  }

  return true;
};

export async function initPasteLinkHandler(bot: Bot<BotContext>) {
  bot.callbackQuery(/^send_anon_reply_to_channel_(\d+)$/, async (ctx) => {
    if (ctx.session.dailyGoldQuota < GoldRate.ANON_REPLY) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "Gold kamu tidak mencukupi ☹️ Silakan upgrade ke premium member untuk mendapat gold lebih banyak 💸."
      );
      return;
    }
    const menfessText = ctx.update.callback_query?.message?.text;
    const channelChatId = ctx.match[1];
    const menfessUID = extractMenfessUID(menfessText);

    if (
      !(await handleValidationErrors(
        ctx,
        ctx.from?.id,
        channelChatId,
        !!channelChatId
      ))
    ) {
      return;
    }

    if (!menfessText || !menfessUID) {
      await ctx.editMessageText("...");
      await ctx.reply("❌ Pesan tidak ditemukan");
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(menfessUID)
      .get()
      .then((doc) => doc.data() as MenfessDbData);

    if (!menfessDbData) {
      await ctx.editMessageText("...");
      await ctx.reply("❌ Pesan tidak ditemukan");
      return;
    }

    if (menfessDbData.isMenfessLocked) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "🔒 Menfess ini dikunci oleh sender, kamu tidak bisa mengirim reply anonim"
      );
      return;
    }
    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_anon_reply"
    );
    await ctx.editMessageText("....");
    const lastReply = await ctx.reply(waitingAnonReplyMessage, {
      reply_markup: cancelKeyboard,
    });

    if (!ctx.from) return;
    ctx.session.route = "anon_reply_mode";
    userInAnonReplyMode.set(ctx.from.id, {
      groupChatId: menfessDbData.groupChatId,
      senderInfo: getFooterMessage(ctx.session),
      messageShoudlDeleted: (lastReply as { message_id: number }).message_id,
    });
  });

  bot.callbackQuery(/^send_anon_reply_to_group_(\d+)$/, async (ctx) => {
    if (ctx.session.dailyGoldQuota < GoldRate.ANON_REPLY) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "Gold kamu tidak mencukupi ☹️ Silakan upgrade ke premium member untuk mendapat gold lebih banyak 💸."
      );
      return;
    }
    const groupChatId = ctx.match[1];
    const menfessText = ctx.update.callback_query?.message?.text;
    const menfessUID = extractMenfessUID(menfessText);

    if (
      !(await handleValidationErrors(
        ctx,
        ctx.from?.id,
        groupChatId,
        !isNaN(Number(groupChatId))
      ))
    ) {
      return;
    }

    if (menfessUID) {
      const menfessDbData = await db
        .collection("menfess")
        .doc(menfessUID)
        .get()
        .then((doc) => doc.data() as MenfessDbData);
      if (menfessDbData.isMenfessLocked) {
        await ctx.editMessageText("...");
        await ctx.reply(
          "🔒 Menfess ini dikunci oleh sender, kamu tidak bisa mengirim reply anonim"
        );
        return;
      }
    }
    const cancelKeyboard = new InlineKeyboard().text(
      "✖️ Cancel",
      "cancel_anon_reply"
    );
    await ctx.editMessageText("....");
    const lastReply = await ctx.reply(waitingAnonReplyMessage, {
      reply_markup: cancelKeyboard,
    });

    if (!ctx.from) return;
    ctx.session.route = "anon_reply_mode";
    userInAnonReplyMode.set(ctx.from.id, {
      groupChatId: Number(groupChatId),
      senderInfo: getFooterMessage(ctx.session),
      messageShoudlDeleted: (lastReply as { message_id: number }).message_id,
    });
  });

  bot.callbackQuery("cancel_anon_reply", async (ctx) => {
    ctx.session.route = "idle";
    userInAnonReplyMode.delete(ctx.from.id);

    await ctx.editMessageText("Kamu membatalkan pengiriman reply anonim.");
  });

  bot.callbackQuery(/^back_to_paste_link_handler_(\d+)$/, async (ctx) => {
    const channelChatId = ctx.match[1];
    ctx.session.route = "idle";
    userInInteractionPlusMode.delete(ctx.from.id);
    const { userId, messageId } = validateIds(
      ctx,
      channelChatId,
      "❌ Channel chat tidak ditemukan, silahkan cek kembali link channel yang kamu masukkan\n\n" +
        "🔗 Contoh link channel yang benar: https://t.me/usernameChannel/111"
    );

    if (!userId) return;
    await ctx.deleteMessage();
    await sendReplyWithKeyboard(
      ctx,
      userId,
      channelChatId as string,
      Number(channelChatId),
      messageId,
      true
    );
  });

  bot.callbackQuery(/^(hitme|who|talk)_plus_(.+)$/, async (ctx) => {
    const action = ctx.callbackQuery.data.split("_")[0];
    const channelChatId = ctx.callbackQuery.data.split("_")[2];
    const userId = ctx.from?.id;
    const userName = ctx.from?.username;

    if (!userId || !action || !userName) {
      return;
    }

    const menfessText = ctx.update.callback_query?.message?.text;
    const menfessUID = extractMenfessUID(menfessText);
    if (
      !(await handleValidationErrors(
        ctx,
        ctx.from?.id,
        channelChatId,
        !!channelChatId
      ))
    ) {
      return;
    }

    if (!menfessUID || !menfessText) {
      await ctx.editMessageText("...");
      await ctx.reply("🌪️ Waduh! Pesan aslinya tidak dapat ditemukan nih 🍃");
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(menfessUID)
      .get()
      .then((doc) => doc.data() as MenfessDbData | undefined);

    if (!menfessDbData) {
      await ctx.editMessageText("...");
      await ctx.reply("🎪 Ups! Pesan aslinya tidak dapat ditemukan nih 🎭");
      return;
    }

    if (menfessDbData.senderId === userId) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "🎪 Ehh.. Kamu tidak bisa berinteraksi dengan menfess kamu sendiri 🎭"
      );
      return;
    }

    if (
      menfessDbData.interactUsers.some((user) => user.userId === userId) &&
      ctx.session.premiumStatus !== 3
    ) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "🎪 Kamu sudah berinteraksi dengan menfess ini sebelumnya 🎭"
      );
      return;
    }
    const hasReachedMaxFreeQuotas =
      ctx.session.dailyGoldQuota < GoldRate.INTERACT &&
      menfessDbData.freeInteractQuota < 1;

    if (hasReachedMaxFreeQuotas) {
      await ctx.editMessageText("...");
      await ctx.reply(
        "💥 Ups! Goldmu tidak cukup dan menfess sudah kehabisan free kuota 🥲"
      );

      if (hasReachedMaxFreeQuotas) {
        await handleMaxInteractionsReached(
          ctx,
          menfessDbData,
          menfessUID,
          menfessText,
          action + "_plus",
          userId
        );
        return;
      }
    }

    const backKeyboard = new InlineKeyboard().text(
      "<< Back",
      `back_to_paste_link_handler_${channelChatId}`
    );
    await ctx.editMessageText("....");
    const lastReply = await ctx.reply(waitingInteractionPlusMessage, {
      reply_markup: backKeyboard,
    });

    ctx.session.route = "interaction_plus_mode";
    userInInteractionPlusMode.set(ctx.from.id, {
      action,
      senderInfo: getAgeAndGender(ctx.session),
      messageShoudlDeleted: (lastReply as { message_id: number }).message_id,
      menfessDbData,
      menfessOnGroupText: sliceMenfessText(menfessText),
      interactorUserName: userName,
      menfessUID,
      channelChatId: channelChatId || "",
    });
  });

  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    if (
      userInAnonReplyMode.has(userId) &&
      ctx.session.route === "anon_reply_mode"
    ) {
      const { groupChatId, senderInfo, messageShoudlDeleted } =
        userInAnonReplyMode.get(userId) || {
          groupChatId: 0,
          senderInfo: "",
          messageShoudlDeleted: undefined,
        };

      if (messageShoudlDeleted) {
        await ctx.api.deleteMessage(ctx.chat.id, messageShoudlDeleted);
      }

      if (!isValidMessage(ctx.message.text, 15)) {
        const cancelKeyboard = new InlineKeyboard().text(
          "✖️ Cancel",
          "cancel_anon_reply"
        );
        const lastReply = await ctx.reply(waitingAnonReplyMessage, {
          reply_markup: cancelKeyboard,
        });

        userInAnonReplyMode.set(userId, {
          groupChatId,
          senderInfo,
          messageShoudlDeleted: (lastReply as { message_id: number })
            .message_id,
        });

        return;
      }

      const messageId = ctx.message?.message_id;
      const sentMessage = await ctx.api.sendMessage(
        botConfig.groupChatId,
        `${ctx.message.text}${senderInfo}`,
        {
          reply_to_message_id: groupChatId,
        }
      );

      ctx.session.route = "idle";
      userInAnonReplyMode.delete(userId);

      await db
        .collection("anonReply")
        .doc(String(sentMessage.message_id))
        .set({
          senderId: userId,
          senderUsername: ctx.from?.username?.toLowerCase(),
          groupChatId: sentMessage.message_id,
          replyToMessageId: groupChatId,
          createdAt: moment().toDate(),
          messagePreview: ctx.message.text.slice(0, 15),
        });

      const link = `https://t.me/${botConfig.groupChatId.replace("@", "")}/${sentMessage.message_id}`;

      const keyboard = new InlineKeyboard().url("🔗Link", link);
      await ctx.reply("👌 Reply anonim kamu berhasil dikirim", {
        reply_to_message_id: messageId,
        reply_markup: keyboard,
      });
      ctx.session.dailyGoldQuota =
        ctx.session.dailyGoldQuota - GoldRate.ANON_REPLY;
    } else if (
      userInInteractionPlusMode.has(userId) &&
      ctx.session.route === "interaction_plus_mode"
    ) {
      const {
        action,
        senderInfo,
        messageShoudlDeleted,
        menfessDbData,
        menfessOnGroupText,
        interactorUserName,
        menfessUID,
        channelChatId,
      } = userInInteractionPlusMode.get(userId) || {
        action: "",
        senderInfo: "",
        messageShoudlDeleted: undefined,
        menfessDbData: {} as MenfessDbData,
        interactorUserName: "",
        menfessOnGroupText: "",
        menfessUID: "",
        channelChatId: "",
      };

      if (messageShoudlDeleted) {
        await ctx.api.deleteMessage(ctx.chat.id, messageShoudlDeleted);
      }

      if (!isValidMessage(ctx.message.text, 15)) {
        const backKeyboard = new InlineKeyboard().text(
          "<< Back",
          `back_to_paste_link_handler_${channelChatId}`
        );
        const lastReply = await ctx.reply(waitingInteractionPlusMessage, {
          reply_markup: backKeyboard,
        });

        userInInteractionPlusMode.set(userId, {
          action,
          senderInfo,
          messageShoudlDeleted: (lastReply as { message_id: number })
            .message_id,
          menfessDbData,
          menfessOnGroupText,
          interactorUserName,
          menfessUID,
          channelChatId,
        });

        return;
      }

      const channelUrl = `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`;
      const isUseSenderFreeQuota =
        ctx.session.dailyGoldQuota < GoldRate.INTERACT &&
        menfessDbData.freeInteractQuota >= 1;

      if (action === "hitme") {
        const keyboard = new InlineKeyboard()
          .text(
            "🥂 Chat Me!",
            `interact_chat_me_${menfessDbData.channelChatId}_${userId}`
          )
          .url("🕵️ Profile?", `tg://user?id=${userId}`)
          .row()
          .url("🔗 Menfess", channelUrl);

        await ctx.api.sendMessage(
          menfessDbData.senderId,
          `💘💘💘\n\n` +
            `✨ *Hallooo!* ✨\n\n` +
            `🎉 Seorang ${senderInfo}\n` +
            `dengan username @${interactorUserName} 💫\n` +
            "Sangat tertarik dengan menfess kamu dan memberikan pesannn buat kamuu 🥰\n\n" +
            `📝 Menfess kamu:\n\n` +
            `❝${menfessOnGroupText}❞\n\n` +
            "💌 Pesan: \n\n" +
            `❝${ctx.message.text}❞\n\n` +
            `💝 Cek profilnya di bawah ini! 👇`,
          { reply_markup: keyboard }
        );
      } else if (action === "who") {
        const keyboard = new InlineKeyboard()
          .text(
            "🫗 Spill Me!",
            `interact_spill_me_${menfessDbData.channelChatId}_${userId}`
          )
          .url("🔗 Menfess", channelUrl)
          .row();

        await ctx.api.sendMessage(
          menfessDbData.senderId,
          `💝💝💝\n\n` +
            `✨ *Heyy!* ✨\n\n` +
            `🎉 Seorang ${senderInfo}\n` +
            `penasaran dan ingin mengetahui siapa yang mengirim menfess ini! 🤔\n\n` +
            `📝 *Menfess kamu:*\n\n` +
            `❝${menfessOnGroupText}❞\n\n` +
            "💌 Pesan: \n\n" +
            `❝${ctx.message.text}❞\n\n` +
            `💫 Apakah kamu ingin memberi tahu identitasmu? 👀`,
          { reply_markup: keyboard }
        );
      } else if (action === "talk") {
        await ctx.api.sendMessage(
          menfessDbData.senderId,
          `Someone wants to talk about this menfess! 💬\n\nYour post: ${menfessOnGroupText}`
        );
      }

      await ctx.reply(
        `Request ${getMenfessText(action + "_plus")} kamu telah disampaikan ke sender 💖`
      );
      await updateInteractUsers(
        menfessUID,
        userId,
        action + "_plus",
        isUseSenderFreeQuota
      );
      ctx.session.route = "idle";
      userInInteractionPlusMode.delete(userId);
      ctx.session.lastSentInteract = moment().toDate();
      ctx.session.dailyGoldQuota =
        ctx.session.dailyGoldQuota - GoldRate.INTERACT;
    } else {
      await next();
    }
  });
}
