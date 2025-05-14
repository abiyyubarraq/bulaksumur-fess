import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { db } from "../utils/firebase";
import { isValidMessage, sanitizeMessage } from "../utils/helpers";
import type { BotContext, ListenFeedbackState } from "../utils/types";

const userStates = new Map<number, ListenFeedbackState>();

const waitingForFeedbackMessage = (feedBackType: string) =>
  `Silahkan balas ke pesan ini dengan ${feedBackType} kamu!` +
  `\n\n` +
  `*Note: Minimal 32 karakter dan hanya boleh mengandungi huruf, angka, spasi, dan tanda baca*` +
  `\n\n` +
  `Gunakan bahasa yang sopan ky kmu ngchat admin fakultas y`;

export function initSendFeedbackHandlers(bot: Bot<BotContext>): void {
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userStates.get(userId);
    if (state?.waitingForContent) {
      userStates.delete(userId);

      try {
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
          .collection("feedbacks")
          .doc()
          .set({
            userId: userId,
            username: ctx.from?.username || "",
            message: sanitizeMessage(messageText),
            feedbackType: state.feedBackType,
            createdAt: new Date(),
            isRead: false,
          });
        await ctx.reply(
          "🙏 Thankyouu feedbacknya! ✨\n" +
            "Nanti tak baca yakk kalo lagi nganggur, 💝 luvv yu! 🤗"
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

export async function startSendFeedBackListener(
  ctx: BotContext,
  feedBackType: ListenFeedbackState["feedBackType"]
) {
  if (
    ctx.session.lastSendFeedback &&
    moment().diff(moment(ctx.session.lastSendFeedback), "hours") < 12
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
