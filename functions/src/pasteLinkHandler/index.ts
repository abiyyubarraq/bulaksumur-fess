import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  extractMenfessUID,
  getFooterMessage,
  isValidMessage,
} from "../utils/helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

const userInAnonReplyMode = new Map<
  number,
  {
    groupChatId: number;
    senderInfo: string;
    messageShoudlDeleted: number | undefined;
  }
>();

const waitingAnonReplyMessage =
  "🔮 Silahkan balas dengan reply anonim yang ingin kamu kirim\n\n" +
  "🦊 Dilarang mengirim link atau username, dan hanya boleh mengirim text dengan character ASCII\n" +
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
  const callbackPrefix = isChannel
    ? "send_anon_reply_to_channel_"
    : "send_anon_reply_to_group_";
  keyboard.text("🥷 Anon Reply", `${callbackPrefix}${sourceId}`);
  // .text("‼️Report", `report_menfess_${isChannel ? "channel" : "group"}_${sourceId}`);

  await ctx.api.copyMessage(
    userId,
    isChannel ? botConfig.channelId : botConfig.groupChatId,
    targetId,
    {
      reply_markup: keyboard,
      reply_to_message_id: messageId,
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
    await ctx.reply("❌ User tidak ditemukan");
    return false;
  }

  if (!isValidChatId) {
    await ctx.reply("❌ Group chat tidak ditemukan");
    return false;
  }

  if (!chatId) {
    await ctx.reply("❌ Chat tidak ditemukan");
    return false;
  }

  return true;
};

export async function initPasteLinkHandler(bot: Bot<BotContext>) {
  bot.callbackQuery(/^send_anon_reply_to_channel_(\d+)$/, async (ctx) => {
    const menfessText = ctx.update.callback_query?.message?.text;
    const channelChatId = ctx.match[1];
    const menfessUID = extractMenfessUID(menfessText);
    const messageId = ctx.update.callback_query?.message?.message_id;

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
      await ctx.reply("❌ Pesan tidak ditemukan");
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(menfessUID)
      .get()
      .then((doc) => doc.data() as MenfessDbData);

    if (!menfessDbData) {
      await ctx.reply("❌ Pesan tidak ditemukan");
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
    const groupChatId = ctx.match[1];

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

      const link = `https://t.me/${botConfig.groupChatId.replace("@", "")}/${sentMessage.message_id}`;

      const keyboard = new InlineKeyboard().url("🔗Link", link);
      await ctx.reply("👌 Reply anonim kamu berhasil dikirim", {
        reply_to_message_id: messageId,
        reply_markup: keyboard,
      });
    } else {
      await next();
    }
  });
}
