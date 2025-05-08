import { FieldValue } from "firebase-admin/firestore";
import { Bot, Context, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import { extractMenfessUID } from "../utils/helpers";
import type { MenfessDbData } from "../utils/types";
export async function postMenfessInteraction(ctx: Context, bot: Bot) {
  const keyboard = new InlineKeyboard()
    .text("👊 Hit Me!", "hitme")
    .text("🕵️ Who?", "who")
    .row()
    .text("💬 Talk!", "talk")
    .text("🚫 Report", "report");

  try {
    await bot.api.sendMessage(botConfig.groupChatId, "💬 INTERAKSI MENFESS", {
      reply_to_message_id: ctx.message?.message_id,
      reply_markup: keyboard,
    });
    const UIDFromMenfess = extractMenfessUID(ctx.message?.text);
    if (UIDFromMenfess) {
      await db.collection("menfess").doc(UIDFromMenfess).update({
        groupChatId: ctx.message?.message_id,
      });

      console.log(
        `Added interaction buttons to groupChatId: ${ctx.message?.message_id}`
      );
    }
  } catch (error) {
    console.error("Error adding interaction buttons:", error);
  }
}

export function isForwardedMenfessFromChannelToGroup(ctx: Context): boolean {
  return Boolean(
    ctx.senderChat?.id === botConfig.channelGroupChatIdNumber &&
      ctx.chat?.id === botConfig.groupChatIdNumber &&
      ctx.message?.message_id
  );
}

/**
 * Initialize interaction handlers
 * @param bot The Telegram bot instance
 */
export function initInteractionHandlers(bot: Bot): void {
  console.log("📋 Initializing interaction handlers");

  bot.callbackQuery(["hitme", "who", "talk", "report"], async (ctx) => {
    const action = ctx.callbackQuery.data;
    const userId = ctx.from?.id;
    const userName = ctx.from?.username;

    if (!userId) {
      await ctx.answerCallbackQuery("User ID not found");
      return;
    }

    const menfessOnGroup = ctx.callbackQuery.message?.reply_to_message;
    const menfessOnGroupId = menfessOnGroup?.message_id;
    const menfessOnGroupText = menfessOnGroup?.text;
    const mmenfessUID = extractMenfessUID(menfessOnGroupText);
    if (!menfessOnGroupId || !mmenfessUID) {
      await ctx.answerCallbackQuery("Cannot find the original message");
      return;
    }

    console.log(
      `Interaction executed: ${action} on message groupChatId: ${menfessOnGroupId}, menfessUID: ${mmenfessUID} | by userId: ${userId} userName: ${userName}`
    );

    const menfessDbData = await db
      .collection("menfess")
      .doc(mmenfessUID)
      .get()
      .then((doc) => {
        return doc.data() as MenfessDbData | undefined;
      });
    if (!menfessDbData) {
      await ctx.answerCallbackQuery("Cannot find the original message");
      return;
    }
    if (menfessDbData.senderId === userId) {
      await ctx.answerCallbackQuery(
        "You cannot interact with your own menfess"
      );
      return;
    }
    if (menfessDbData.interactUsers.includes(userId)) {
      await ctx.answerCallbackQuery(
        "You have already interacted with this menfess"
      );
      return;
    }

    if (action === "hitme") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone hit your menfess! 👊\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("Your request sent to user");
    } else if (action === "who") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone asked who hit your menfess! 👊\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("Your request sent to user");
    } else if (action === "talk") {
      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `Someone wants to talk about this menfess! 💬\n\nYour post: ${menfessOnGroupText}`
      );
      await ctx.answerCallbackQuery("Your request sent to user");
    } else if (action === "report") {
      await db.collection("reports").doc(mmenfessUID).set({
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
        `Your report has been sent to the admin! 🚫`
      );
    }

    await db
      .collection("menfess")
      .doc(mmenfessUID)
      .update({
        interactUsers: FieldValue.arrayUnion(userId),
      });
  });
}
