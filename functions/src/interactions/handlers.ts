import { FieldValue } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import { extractMenfessUID } from "../utils/helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

/**
 * Post menfess interaction
 * @param ctx The context object
 * @param bot The bot instance
 */
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

/**
 * Check if the message is forwarded from the channel to the group
 * @param ctx The context object
 * @returns True if the message is forwarded from the channel to the group, false otherwise
 */
export function isForwardedMenfessFromChannelToGroup(ctx: BotContext): boolean {
  return Boolean(
    ctx.senderChat?.id === botConfig.channelGroupChatIdNumber &&
      ctx.chat?.id === botConfig.groupChatIdNumber &&
      ctx.message?.message_id &&
      extractMenfessUID(ctx.message.text)
  );
}

/**
 * Initialize interaction handlers
 * @param bot The Telegram bot instance
 */
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

    if (action === "hitme") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone hit your menfess! 👊\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "who") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone asked who hit your menfess! 👊\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "talk") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone wants to talk about this menfess! 💬\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("❤️ Your request sent to user");
    } else if (action === "report") {
      await db.collection("menfessReports").add({
        reporterId: userId,
        reporterUsername: userName,
        menfessUID: mmenfessUID,
        menfessText: menfessOnGroupText,
        menfessSenderId: menfessDbData.senderId,
        menfessSenderUsername: menfessDbData.senderUserName,
        menfessChannelChatId: menfessDbData.channelChatId,
        menfessGroupChatId: menfessDbData.groupChatId,
        createdAt: new Date(),
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
  });
}
