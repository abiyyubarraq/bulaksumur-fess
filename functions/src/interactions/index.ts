import { FieldValue } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import { extractMenfessUID } from "../utils/helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

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
    const UIDFromMenfess = extractMenfessUID(ctx.message?.text);
    if (UIDFromMenfess) {
      await db.collection("menfess").doc(UIDFromMenfess).update({
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

export function isForwardedMenfessFromChannelToGroup(ctx: BotContext): boolean {
  return Boolean(
    ctx.senderChat?.id === botConfig.channelGroupChatIdNumber &&
      ctx.chat?.id === botConfig.groupChatIdNumber &&
      ctx.message?.message_id &&
      extractMenfessUID(ctx.message.text)
  );
}

export function isChatFromUserToGroup(ctx: BotContext): boolean {
  return Boolean(
    ctx.update?.message?.chat?.id &&
      ctx.update?.message?.chat?.id === Number(botConfig.groupChatIdNumber)
  );
}

export function initInteractionHandlers(bot: Bot<BotContext>): void {
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
    const menfessOnGroupText = menfessOnGroup?.text;
    const mmenfessUID = extractMenfessUID(menfessOnGroupText);
    if (!menfessOnGroupId || !mmenfessUID) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "Cannot find the original message",
      });
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(mmenfessUID)
      .get()
      .then((doc) => {
        return doc.data() as MenfessDbData | undefined;
      });
    if (!menfessDbData) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "Cannot find the original message",
      });
      return;
    }
    if (menfessDbData.senderId === userId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "You cannot interact with your own menfess",
      });
      return;
    }
    if (menfessDbData.interactUsers.some((user) => user.userId === userId)) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "You have already interacted with this menfess",
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

    if (action === "hitme") {
      const keyboard = new InlineKeyboard()
        .text(
          "🥂 Chat Me!",
          `response_interact_chat_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🕵️ Profile?", `https://t.me/${userName}`)
        .row()
        .url(
          "🔗 Menfess",
          `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`
        );

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Hallooo!* ✨\n\n` +
          `🎉 Seseorang tertarik dengan menfess kamu! 💫\n\n` +
          `📝 Menfess kamu:\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💝 Cek profilnya di bawah ini! 👇`,
        { reply_markup: keyboard }
      );
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "who") {
      const keyboard = new InlineKeyboard()
        .text(
          "🫗 Spill Me!",
          `response_interact_spill_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url(
          "🔗 Menfess",
          `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`
        )
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
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "talk") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone wants to talk about this menfess! 💬\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "report") {
      await db.collection(`user/${userId}/reports`).add({
        reporterId: userId,
        reporterUsername: userName,
        menfessUID: mmenfessUID,
        menfessText: menfessOnGroupText,
        userId: menfessDbData.senderId,
        userName: menfessDbData.senderUserName,
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
      `groupChatId: ${menfessOnGroupId} | menfessUID: ${mmenfessUID} | by userId: ${userId} | userName: ${userName} | Interaction executed: ${action} `
    );
    await db
      .collection("menfess")
      .doc(mmenfessUID)
      .update({
        interactUsers: FieldValue.arrayUnion({
          userId: userId,
          action: action,
        }),
      });
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
      .url(
        `👤 Sender`,
        `https://t.me/${senderMenfessUsername}/${senderMenfessId}`
      )
      .url(
        "Menfess",
        `https://t.me/${botConfig.channelId.replace("@", "")}/${channelChatId}`
      )
      .row();

    const messages = {
      chat_me:
        "User dari menfess yang kamu hit ingin berbicara dengan kamu! ❤️\n\n",
      spill_me:
        "User dari menfess yang kamu hit setuju untuk ngespill profilenya ke kamu! 🫗\n\n",
    };

    await ctx.api.sendMessage(
      userInteractId,
      messages[type as keyof typeof messages] +
        `Silahkan klik tombol dibawah untuk langsung ke profile sender!`,
      { reply_markup: keyboard }
    );

    await ctx.editMessageText(
      `Jawaban kamu sudah dikirim ke user yang tertarik dengan menfess kamu! 📤`
    );
  };

  bot.callbackQuery(/^response_interact_chat_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "chat_me");
  });

  bot.callbackQuery(/^response_interact_spill_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "spill_me");
  });
}
