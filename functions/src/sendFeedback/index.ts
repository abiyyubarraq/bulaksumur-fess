import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { db } from "../utils/firebase";
import { isValidMessage, sanitizeMessage } from "../utils/helpers";
import type { BotContext, ListenFeedbackState } from "../utils/types";

const userStates = new Map<number, ListenFeedbackState>();

const waitingForFeedbackMessage = (feedBackType: string) =>
  `💬 Silahkan balas dengan ${feedBackType} yang ingin kamu sampaikan! ✨😊` +
  `\n\n` +
  `*Note: Minimal 32 karakter dan hanya boleh mengandungi huruf, angka, spasi, dan tanda baca* 👍` +
  `\n\n` +
  `Gunakan bahasa yang sopan ky kmu ngchat admin fakultas y 😊 oiya kamu cuma bisa kirim feedback sekali dalam 12 jam 🎩`;

export function initSendFeedbackHandlers(bot: Bot<BotContext>): void {
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userStates.get(userId);
    if (state?.waitingForContent && ctx.session.route === "send_feedback") {
      ctx.session.route = "idle";
      userStates.delete(userId);

      try {
        if (state.messageToDelete) {
          await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
        }

        const messageText = ctx.message.text;

        if (!isValidMessage(messageText)) {
          const keyboard = new InlineKeyboard();
          keyboard.text("« BACK", "back_to_send_feedback_menu");
          const sentMessage = await ctx.reply(
            waitingForFeedbackMessage(state.feedBackType),
            {
              reply_markup: keyboard,
              reply_to_message_id: ctx.message?.message_id,
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
            "Nanti tak baca yakk kalo lagi nganggur, 💝 luvv yu! 🤗",
          {
            reply_to_message_id: ctx.message?.message_id,
          }
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
      "⏳ Kamu cuma bisa kirim feedback sekali dalam 12 jam. Coba lagi nanti ya! 😊"
    );
    return;
  }
  const userId = ctx.from?.id;
  if (!userId) return;

  const keyboard = new InlineKeyboard();
  keyboard.text("« BACK", "back_to_send_feedback_menu");
  // Set user state to waiting for content
  const sentMessage = (await ctx.editMessageText(
    waitingForFeedbackMessage(feedBackType),
    {
      reply_markup: keyboard,
    }
  )) as { message_id: number };
  ctx.session.route = "send_feedback";
  userStates.set(userId, {
    waitingForContent: true,
    messageToDelete: sentMessage?.message_id,
    feedBackType,
  });
}
