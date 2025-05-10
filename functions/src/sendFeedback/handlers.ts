import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { db } from "../utils/firebase";
import { isValidMessage, sanitizeMessage } from "../utils/helpers";
import type { BotContext, FeedbackState } from "../utils/types";

const userStates = new Map<number, FeedbackState>();

const waitingForFeedbackMessage = (feedBackType: string) =>
  `Silahkan balas ke pesan ini dengan ${feedBackType} kamu!` +
  `\n\n` +
  `*Note: Minimal 32 karakter dan hanya boleh mengandungi huruf, angka, spasi, dan tanda baca*` +
  `\n\n` +
  `Gunakan bahasa yang sopan ky kmu ngchat admin fakultas y`;

/**
 * Initialize send feedback handlers
 * @param bot Bot instance
 */
export function initSendFeedbackHandlers(bot: Bot<BotContext>): void {
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userStates.get(userId);
    if (state?.waitingForContent) {
      userStates.delete(userId);

      try {
        // Delete the waiting message if it exists
        if (state.messageToDelete) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
          } catch (error) {
            console.error("Failed to delete message:", error);
          }
        }

        const messageText = ctx.message.text;

        if (!isValidMessage(messageText)) {
          const keyboard = new InlineKeyboard();
          keyboard.text("« BACK", "back_to_send_feedback_menu");
          const sentMessage = await ctx.reply(
            waitingForFeedbackMessage(state.feedBackType),
            {
              reply_markup: keyboard,
            }
          );
          userStates.set(userId, {
            waitingForContent: true,
            messageToDelete: sentMessage?.message_id,
            feedBackType: state.feedBackType,
          });

          return;
        }

        await db
          .collection("feedback")
          .doc()
          .set({
            userId: userId,
            message: sanitizeMessage(messageText),
            feedbackType: state.feedBackType,
            createdAt: new Date(),
          });
        await ctx.reply(
          "Thank you for your feedback! ✅\n" +
            "We will review your feedback and get back to you as soon as possible."
        );
        ctx.session.lastSendFeedback = new Date();
      } catch (error) {
        console.error("Error sending feedback:", error);
        await ctx.reply(
          "Sorry, there was an error sending your feedback. Please try again later."
        );
      }
    } else {
      await next();
      return;
    }
  });
}

/**
 * Handle send feedback menu
 * @param ctx Bot context
 * @param feedBackType Type of feedback
 */
export async function startSendFeedBackListener(
  ctx: BotContext,
  feedBackType: FeedbackState["feedBackType"]
) {
  if (
    ctx.session.lastSendFeedback &&
    moment(ctx.session.lastSendFeedback).isAfter(moment().subtract(12, "hours"))
  ) {
    await ctx.deleteMessage();
    await ctx.reply(
      "You can only send feedback once per 12 hours. Please try again later."
    );
    return;
  }
  const userId = ctx.from?.id;
  if (!userId) return;

  // If callback query, answer it
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
  const keyboard = new InlineKeyboard();
  keyboard.text("« BACK", "back_to_send_feedback_menu");
  // Set user state to waiting for content
  const sentMessage = (await ctx.editMessageText(
    waitingForFeedbackMessage(feedBackType),
    {
      reply_markup: keyboard,
    }
  )) as { message_id: number };

  userStates.set(userId, {
    waitingForContent: true,
    messageToDelete: sentMessage?.message_id,
    feedBackType,
  });
}
