import { Bot, InlineKeyboard } from "grammy";
import { handlePostCommand } from "../postMenfess/handlers";
import { botConfig } from "../utils/config";
import { MONTH_NAMES } from "../utils/constants";
import { getPremiumBadge } from "../utils/helpers";
import type { BotContext } from "../utils/types";

/**
 * Initialize basic bot commands
 * @param bot The Telegram bot instance
 */
export function initCommands(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Bulaksumur Menfess Bot Commands:\n\n" +
        "/menu - Get the main menu\n" +
        `/post - Create a new anonymous post (must include "${botConfig.postTrigger}" in the message)\n` +
        "/cancel - Cancel current operation\n" +
        "/profile - View your user profile\n" +
        "/help - Show this help message\n\n" +
        `You can send text, or photos for your menfess posts. All posts must include the word "${botConfig.postTrigger}".\n\n` +
        "All posts will be sent to the channel and duplicated in the group chat where members can interact with them using the provided buttons."
    );
  });

  bot.command("menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  bot.callbackQuery("back_to_menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  bot.callbackQuery("start_post", async (ctx) => {
    const keyboard = new InlineKeyboard();
    keyboard
      .text("Menfess 🔮", "post_menfess")
      .text("Anon Message 📝", "post_anon_message")
      .row()
      .text("« BACK", "back_to_menu");

    await ctx.editMessageText("Kamu ingin mengirim apa di Base Alter Jogja ?", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery("post_menfess", async (ctx) => {
    await handlePostCommand(ctx);
  });

  // Handlers for other message types
  bot.callbackQuery("post_anon_message", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "Silahkan kirim pesan anonymous kamu (tanpa perlu menambahkan trigger word)."
    );
  });

  async function sendMainMenu(ctx: BotContext) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const keyboard = new InlineKeyboard();

    keyboard
      .text("Kritik, Saran, Tanya, Lapor 📝", "report_feedback")
      .row()
      .text("Profile 👤", "view_profile")
      .text("Inbox 📬", "view_inbox")
      .row()
      .text("Riwayat 🌟", "view_history")
      .text("Beli 🛒", "purchase_premium")
      .row()
      .text("Bantuan ❓", "get_help")
      .text("Peraturan 📜", "view_rules")
      .row()
      .text("Kirim ▶️", "start_post");

    const username = ctx.from?.username || "-";
    const gender = ctx.session.gender === "M" ? "M" : "F";
    const birthMonth =
      ctx.session.birthMonth && MONTH_NAMES[ctx.session.birthMonth - 1]
        ? MONTH_NAMES[ctx.session.birthMonth - 1]
        : "-";
    const birthYear = ctx.session.birthYear || "-";
    const premiumStatus = ctx.session.premiumStatus;

    // Use editMessageText for callback queries, and reply for commands
    const messageText =
      `👽 Name : @${username}${getPremiumBadge(premiumStatus)}\n` +
      `👤 AnonName : ${ctx.session.anonName}\n` +
      `🚹 Sex : ${gender}\n` +
      `👶 Birth : ${birthMonth} ${birthYear}\n` +
      // `⚡ Score : ${1000}\n` +
      // `💰 Gold : ${2000}\n\n` +
      `🆔 ID : ${userId}\n` +
      `⏱️ Join time : ${ctx.session.registeredAt ? new Date(ctx.session.registeredAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}\n\n` +
      `📅 Premium until : ${ctx.session.premiumUntil ? new Date(ctx.session.premiumUntil).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}\n\n` +
      `👪 Channel Base: @${botConfig.channelId.replace("@", "")}`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(messageText, {
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(messageText, {
        reply_markup: keyboard,
      });
    }
  }
}
