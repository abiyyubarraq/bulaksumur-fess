import { type Bot, InlineKeyboard } from "grammy";
import type { BotContext } from "../utils/types";

const usersInAnonMessageMode = new Map<number, number>();
const userInReportingUserMode = new Map<number, number>();

export function initViewUserProfile(bot: Bot<BotContext>): void {
  bot.callbackQuery(/^user_(\d+)_block_(\d+)$/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.answerCallbackQuery({
      text: `User with ID ${targetUserId} has been blocked.`,
      show_alert: true,
    });
    // Remove the reply markup
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: [] },
    });
  });

  bot.callbackQuery(/^user_(\d+)_report_(\d+)$/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.answerCallbackQuery({
      text: `User with ID ${targetUserId} has been reported. Moderators will review this case.`,
      show_alert: true,
    });
    // Remove the reply markup
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: [] },
    });
  });

  bot.callbackQuery(/^user_(\d+)_send_anon_to_(\d+)$/, async (ctx) => {
    const targetUserId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();

    // Store the target user ID for later use
    if (ctx.from) {
      usersInAnonMessageMode.set(ctx.from.id, targetUserId);

      if (ctx.session) {
        ctx.session.lastSentInteract = new Date();
      }
    }

    // Create a cancel button
    const cancelKeyboard = new InlineKeyboard().text(
      "« Cancel",
      "cancel_anon_message"
    );

    await ctx.reply(
      `Send your anonymous message to user with ID ${targetUserId}.\n\nType your message below:`,
      {
        reply_markup: cancelKeyboard,
      }
    );
  });

  bot.callbackQuery("cancel_anon_message", async (ctx) => {
    if (ctx.from) {
      usersInAnonMessageMode.delete(ctx.from.id);
    }
    await ctx.answerCallbackQuery({ text: "Anonymous message canceled" });
    await ctx.reply("You've canceled sending an anonymous message.");
  });

  // Handle incoming messages for users in anon message mode
  bot.on("message:text", async (ctx, next) => {
    if (ctx.from && usersInAnonMessageMode.has(ctx.from.id)) {
      const targetUserId = usersInAnonMessageMode.get(ctx.from.id);
      const messageText = ctx.message.text;

      if (!targetUserId) {
        await ctx.reply("An error occurred. Please try again.");
        return;
      }

      try {
        // Get sender info
        const senderData = ctx.session;
        let senderName = "Anonymous";

        if (senderData && senderData.anonName) {
          senderName = senderData.anonName;
        }

        // Format anonymous message
        const formattedMessage = `🔹 Anonymous Message\n\nFrom: ${senderName}\n\n${messageText}`;

        // Send message to target user
        await ctx.api.sendMessage(targetUserId, formattedMessage);

        // Confirm to sender
        await ctx.reply("✅ Your anonymous message has been sent!");

        // Clean up
        if (ctx.from) {
          usersInAnonMessageMode.delete(ctx.from.id);
        }
      } catch (error) {
        console.error("Error sending anonymous message:", error);
        await ctx.reply(
          "❌ Failed to send anonymous message. The user may have blocked the bot."
        );
      }

      return;
    }

    // Continue to next middleware if not in anon message mode
    return next();
  });
}
