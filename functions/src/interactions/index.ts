import { FieldValue } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import { extractMenfessUID } from "../utils/helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

const getMenfessText = (type: string): string => {
  const texts = {
    hitme: "👊 Hit Me!",
    who: "🕵️ Who?",
    talk: "💬 Talk!",
    report: "🚫 Report",
  };
  return texts[type as keyof typeof texts] || "";
};

export async function postMenfessInteraction(
  ctx: BotContext,
  bot: Bot<BotContext>
) {
  const keyboard = new InlineKeyboard()
    .text("👊 Hit Me!", "hitme")
    .text("🕵️ Who?", "who")
    .row()
    .text("💬 Talk!", "talk")
    .text("🚫 Report", "report");

  try {
    const interactionButton = await bot.api.sendMessage(
      botConfig.groupChatId,
      "💬 INTERAKSI MENFESS",
      {
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: keyboard,
      }
    );
    const menfessUID = extractMenfessUID(
      ctx.message?.text || ctx.message?.caption
    );
    if (menfessUID) {
      await db.collection("menfess").doc(menfessUID).update({
        groupChatId: ctx.message?.message_id,
        groupChatButtonId: interactionButton.message_id,
      });

      console.log(
        `groupChatId: ${ctx.message?.message_id} | Added interaction buttons to menfess`
      );
    }
  } catch (error) {
    console.error("Error adding interaction buttons:", error);
  }
}

export function initInteractionHandlers(bot: Bot<BotContext>): void {
  // Helper function to handle quota exceeded scenario
  const handleMaxInteractionsReached = async (
    ctx: BotContext,
    menfessDbData: MenfessDbData,
    menfessUID: string,
    menfessText: string | undefined,
    action: string,
    userId: number
  ) => {
    const keyboard = new InlineKeyboard().url(
      "🔗 Menfess",
      `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`
    );

    await ctx.api.sendMessage(
      menfessDbData.senderId,
      `✨ *Hallooo!* ✨\n\n` +
        `📝 Menfess kamu ini: \n` +
        `❝${menfessText}❞\n\n` +
        `🎯 Mendapatkan interaksi sebanyak ${menfessDbData.interactUsers.length + 1}X:\n` +
        menfessDbData.interactUsers.map((x) => x.action + "\n") +
        getMenfessText(action) +
        "\n" +
        `\n😔 Namun sayang sekali Kuota menerima Interaksi Kamu sudah habis.\n\n✨ Silahkan Upgrade Membership Kamu agar mendapatkan Kuota Interaksi lebih banyak yaaa 🚀 ⭐️ 💫`,
      {
        reply_markup: keyboard,
      }
    );

    await updateInteractUsers(menfessUID, userId, action);
    ctx.session.lastSentInteract = new Date();
  };

  // Helper function to update interact users in the database
  const updateInteractUsers = async (
    menfessUID: string,
    userId: number,
    action: string
  ) => {
    await db
      .collection("menfess")
      .doc(menfessUID)
      .update({
        interactUsers: FieldValue.arrayUnion({
          userId: userId,
          action: getMenfessText(action),
        }),
      });
  };

  bot.callbackQuery(["hitme", "who", "talk", "report"], async (ctx) => {
    const action = ctx.callbackQuery.data;
    const userId = ctx.from?.id;
    const userName = ctx.from?.username;

    if (!userId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "User ID not found",
      });
      return;
    }

    const menfessOnGroup = ctx.callbackQuery.message?.reply_to_message;
    const menfessOnGroupId = menfessOnGroup?.message_id;
    const menfessOnGroupText = menfessOnGroup?.text || menfessOnGroup?.caption;
    const menfessUID = extractMenfessUID(menfessOnGroupText);

    if (!menfessOnGroupId || !menfessUID) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🌪️ Waduh! Pesan aslinya tidak dapat ditemukan nih 🍃",
      });
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(menfessUID)
      .get()
      .then((doc) => doc.data() as MenfessDbData | undefined);

    if (!menfessDbData) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Ups! Pesan aslinya tidak dapat ditemukan nih 🎭",
      });
      return;
    }

    if (menfessDbData.senderId === userId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Ehh.. Kamu tidak bisa berinteraksi dengan menfess kamu sendiri 🎭",
      });
      return;
    }

    if (menfessDbData.interactUsers.some((user) => user.userId === userId)) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Kamu sudah berinteraksi dengan menfess ini sebelumnya 🎭",
      });
      return;
    }

    if (moment().diff(ctx.session.lastSentInteract, "minutes") < 1) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "Sabar ya, kamu baru saja mengirim interaksi sebelumnya. Tunggu 1 menit lagi ya!",
      });
      return;
    }

    const hasReachedMaxInteractions =
      menfessDbData.interactUsers.length >= menfessDbData.maxInteract;
    const channelUrl = `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`;

    if (action === "hitme") {
      if (hasReachedMaxInteractions) {
        await handleMaxInteractionsReached(
          ctx,
          menfessDbData,
          menfessUID,
          menfessOnGroupText,
          action,
          userId
        );
        return;
      }

      const keyboard = new InlineKeyboard()
        .text(
          "🥂 Chat Me!",
          `response_interact_chat_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🕵️ Profile?", `tg://user?id=${userId}`)
        .row()
        .url("🔗 Menfess", channelUrl);

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Hallooo!* ✨\n\n` +
          `🎉 Seseorang dengan username @${userName} tertarik dengan menfess kamu! 💫\n\n` +
          `📝 Menfess kamu:\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💝 Cek profilnya di bawah ini! 👇`,
        { reply_markup: keyboard }
      );
      await ctx.answerCallbackQuery(
        "Request kamu telah disampaikan ke sender 💖"
      );
    } else if (action === "who") {
      if (hasReachedMaxInteractions) {
        await handleMaxInteractionsReached(
          ctx,
          menfessDbData,
          menfessUID,
          menfessOnGroupText,
          action,
          userId
        );
        return;
      }

      const keyboard = new InlineKeyboard()
        .text(
          "🫗 Spill Me!",
          `response_interact_spill_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🔗 Menfess", channelUrl)
        .row();

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Heyy!* ✨\n\n` +
          `🔍 Seseorang penasaran dan ingin mengetahui siapa yang mengirim menfess ini! 🤔\n\n` +
          `📝 *Menfess kamu:*\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💫 Apakah kamu ingin memberi tahu identitasmu? 👀`,
        { reply_markup: keyboard }
      );
      await ctx.answerCallbackQuery(
        "Request kamu telah disampaikan ke sender 💖"
      );
    } else if (action === "talk") {
      if (hasReachedMaxInteractions) {
        await handleMaxInteractionsReached(
          ctx,
          menfessDbData,
          menfessUID,
          menfessOnGroupText,
          action,
          userId
        );
        return;
      }

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone wants to talk about this menfess! 💬\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery(
        "Request kamu telah disampaikan ke sender 💖"
      );
    } else if (action === "report") {
      await db.collection(`users/${menfessDbData.senderId}/reports`).add({
        reporterId: userId,
        reporterUsername: userName?.toLowerCase() || "",
        menfessUID: menfessUID,
        menfessText: menfessOnGroupText?.slice(0, -24),
        userId: menfessDbData.senderId,
        userName: menfessDbData.senderUserName.toLowerCase(),
        menfessChannelChatId: menfessDbData.channelChatId,
        menfessGroupChatId: menfessDbData.groupChatId,
        createdAt: new Date(),
        isFromMenfess: true,
        isRead: false,
      });
      await ctx.answerCallbackQuery(
        "Your report has been sent to the admin 🫡"
      );
    }

    console.log(
      `groupChatId: ${menfessOnGroupId} | menfessUID: ${menfessUID} | by userId: ${userId} | userName: ${userName} | Interaction executed: ${action}`
    );

    await updateInteractUsers(menfessUID, userId, action);
    ctx.session.lastSentInteract = new Date();
  });

  const handleInteractionResponse = async (ctx: BotContext, type: string) => {
    const senderMenfessId = ctx.from?.id;
    const senderMenfessUsername = ctx.from?.username;
    const interactReqData = ctx.callbackQuery?.data?.match(
      new RegExp(`^response_interact_${type}_(.+)$`)
    );

    if (!interactReqData || !interactReqData[1]) {
      await ctx.answerCallbackQuery({
        text: "Cant find menfess data",
        show_alert: true,
      });
      return;
    }

    const [channelChatId, userInteractId] = interactReqData[1].split("_");

    if (!channelChatId || !userInteractId) {
      await ctx.answerCallbackQuery({
        text: "Cant find menfess data",
        show_alert: true,
      });
      return;
    }

    const keyboard = new InlineKeyboard()
      .url(`👯 Sender`, `tg://user?id=${senderMenfessId}`)
      .url(
        "🖇️ Menfess",
        `https://t.me/${botConfig.channelId.replace("@", "")}/${channelChatId}`
      )
      .row();

    const messages = {
      chat_me: `💌💌\n\nUser @${senderMenfessUsername} dari menfess yang kamu hit ingin berbicara dengan kamu! 💘\n`,
      spill_me: `💌💌\n\nUser @${senderMenfessUsername} dari menfess yang kamu hit setuju untuk ngespill profilenya ke kamu! 🫗\n`,
    };

    await ctx.api.sendMessage(
      userInteractId,
      messages[type as keyof typeof messages] +
        `Silahkan klik tombol dibawah untuk langsung ke profile sender! 💫`,
      { reply_markup: keyboard }
    );

    const textMessage =
      ctx.update.callback_query?.message?.text ||
      ctx.update.callback_query?.message?.caption;
    const messageKeyboard =
      ctx.update.callback_query?.message?.reply_markup?.inline_keyboard;
    const actionText = type === "chat_me" ? "🥂 Chat Me!" : "🫗 Spill Me!";
    const editedMessage = `${textMessage}\n\n <u>Kamu memilih "${actionText}", jawaban kamu sudah dikirim ke user yang tertarik dengan menfess kamu!</u> 📤`;

    if (type === "chat_me") {
      const userUrl = (messageKeyboard?.[0]?.[1] as { url: string }).url;
      const menfessUrl = (messageKeyboard?.[1]?.[0] as { url: string }).url;

      const keyboardMarkupChatMe = new InlineKeyboard()
        .url("👤 Sender", userUrl)
        .url("🔗 Menfess", menfessUrl)
        .row();

      await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: keyboardMarkupChatMe,
      });
    } else if (type === "spill_me") {
      const menfessUrl = (messageKeyboard?.[0]?.[1] as { url: string }).url;

      const keyboardMarkupSpillMe = new InlineKeyboard()
        .url("🔗 Menfess", menfessUrl)
        .row();

      await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: keyboardMarkupSpillMe,
      });
    }
  };

  bot.callbackQuery(/^response_interact_chat_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "chat_me");
  });

  bot.callbackQuery(/^response_interact_spill_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "spill_me");
  });
}
