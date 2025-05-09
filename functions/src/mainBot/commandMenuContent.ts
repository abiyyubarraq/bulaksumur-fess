import { InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { MONTH_NAMES } from "../utils/constants";
import { getPremiumBadge } from "../utils/helpers";
import type { BotContext } from "../utils/types";

export async function sendMainMenu(ctx: BotContext) {
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

export async function sendRulesMenu(ctx: BotContext) {
  await ctx.reply("Rules"); // TODO: Add rules menu
}
export async function sendHelpMenu(ctx: BotContext) {
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
}
export async function sendStartPostMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard();
  keyboard
    .text("Menfess 🔮", "post_menfess")
    .text("Anon Message 📝", "post_anon_message")
    .row()
    .text("« BACK", "back_to_main_menu");

  await ctx.editMessageText("Kamu ingin mengirim apa di Bulaksumur Base?", {
    reply_markup: keyboard,
  });
}
