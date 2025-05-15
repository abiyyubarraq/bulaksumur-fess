import type { ParseModeFlavor } from "@grammyjs/parse-mode";
import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import { extractMenfessUID } from "../utils/helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

const userInAnonReplyMode = new Map<
  number,
  {
    groupChatId: number;
    senderInfo: string;
    messageShoulDeleted: (number | undefined)[];
  }
>();

export async function sendPasteChannelLinkMenu(
  ctx: ParseModeFlavor<BotContext>
) {
  const channelChatId = ctx.update.message?.text?.split("/")[4];
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  if (!channelChatId || isNaN(Number(channelChatId))) {
    ctx.reply(
      "❌ Channel chat tidak ditemukan, silahkan cek kembali link channel yang kamu masukkan\n\n" +
        "🔗 Contoh link channel yang benar: https://t.me/usernameChannel/111"
    );
    return;
  }

  const messageId = ctx.message?.message_id;

  const keyboard = new InlineKeyboard();
  keyboard.text("🥷 Anon Reply", `send_anon_reply_to_channel_${channelChatId}`);
  // .text("‼️Report", `report_menfess_channel_${channelChatId}`);

  await ctx.api.copyMessage(
    userId,
    botConfig.channelId,
    Number(channelChatId),
    {
      reply_markup: keyboard,
      reply_to_message_id: messageId,
    }
  );
}

export async function sendPasteGroupLinkMenu(ctx: ParseModeFlavor<BotContext>) {
  const groupChatId = ctx.update.message?.text?.split("/")[4];
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }
  if (!groupChatId || isNaN(Number(groupChatId))) {
    ctx.reply(
      "❌ Group chat tidak ditemukan, silahkan cek kembali link grup yang kamu masukkan\n\n" +
        "🔗 Contoh link grup yang benar: https://t.me/usernameGroup/111"
    );
    return;
  }

  const messageId = ctx.message?.message_id;

  const keyboard = new InlineKeyboard();
  keyboard.text("🥷 Anon Reply", `send_anon_reply_to_group_${groupChatId}`);
  // .text("‼️Report", `report_menfess_group_${groupChatId}`);

  await ctx.api.copyMessage(
    userId,
    botConfig.groupChatId,
    Number(groupChatId),
    {
      reply_markup: keyboard,
      reply_to_message_id: messageId,
    }
  );
}

export async function initPasteLinkHandler(
  bot: Bot<ParseModeFlavor<BotContext>>
) {
  bot.callbackQuery(/^send_anon_reply_to_channel_(\d+)$/, async (ctx) => {
    const menfessText = ctx.update.callback_query?.message?.text;
    const channelChatId = ctx.match[1];
    const menfessUID = extractMenfessUID(menfessText);
    const messageId = ctx.update.callback_query?.message?.message_id;

    if (!ctx.from?.id) {
      await ctx.reply("❌ User tidak ditemukan");
      return;
    }

    if (!menfessText || !channelChatId || !menfessUID) {
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
    }

    const botMessage = await ctx.reply(
      "🔮 Silahkan balas dengan reply anonim yang ingin kamu kirim",
      {
        reply_to_message_id: messageId,
      }
    );
    userInAnonReplyMode.set(ctx.from.id, {
      groupChatId: menfessDbData.groupChatId,
      senderInfo: ctx.session.gender === "M" ? "🕺 #M✘✘" : "💃 #F✘✘",
      messageShoulDeleted: [
        messageId,
        (botMessage as { message_id: number }).message_id,
      ],
    });
  });

  bot.callbackQuery(/^send_anon_reply_to_group_(\d+)$/, async (ctx) => {
    const groupChatId = ctx.match[1];
    const messageId = ctx.update.callback_query?.message?.message_id;

    if (!ctx.from?.id) {
      await ctx.reply("❌ User tidak ditemukan");
      return;
    }

    if (!groupChatId || isNaN(Number(groupChatId))) {
      await ctx.reply("❌ Group chat tidak ditemukan");
      return;
    }

    const botMessage = await ctx.reply(
      "🔮 Silahkan balas dengan reply anonim yang ingin kamu kirim",
      {
        reply_to_message_id: messageId,
      }
    );
    userInAnonReplyMode.set(ctx.from.id, {
      groupChatId: Number(groupChatId),
      senderInfo: ctx.session.gender === "M" ? "🕺 #M✘✘" : "💃 #F✘✘",
      messageShoulDeleted: [
        messageId,
        (botMessage as { message_id: number }).message_id,
      ],
    });
  });

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }
    if (userInAnonReplyMode.has(userId)) {
      const { groupChatId, senderInfo, messageShoulDeleted } =
        userInAnonReplyMode.get(userId) || {
          groupChatId: 0,
          senderInfo: "",
          messageShoulDeleted: [],
        };

      const messageId = ctx.message?.message_id;
      ctx.api.sendMessage(
        botConfig.groupChatId,
        `${ctx.message.text}\n\n${senderInfo}`,
        {
          reply_to_message_id: groupChatId,
        }
      );
      for (const messageId of messageShoulDeleted) {
        if (messageId) {
          await ctx.api.deleteMessage(ctx.chat.id, messageId);
        }
      }
      userInAnonReplyMode.delete(userId);
      ctx.reply("👌 Reply anonim kamu berhasil dikirim", {
        reply_to_message_id: messageId,
      });
    }
  });
}
