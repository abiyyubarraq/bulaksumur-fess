import { InlineKeyboard } from "grammy";
import moment from "moment";
import { botConfig } from "../../../utils/config";
import { MONTH_NAMES } from "../../../utils/constants";
import { db } from "../../../utils/firebase";
import { getPremiumBadge } from "../../../utils/helpers";
import type { BotContext, UserDbData } from "../../../utils/types";

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
    // .text("Riwayat 🌟", "view_history")
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
    `⏱️ Join time : ${ctx.session.registeredAt ? moment(ctx.session.registeredAt).format("DD/MM/YYYY HH:mm") : "-"}\n\n` +
    `📅 Premium until : ${ctx.session.premiumUntil ? moment(ctx.session.premiumUntil).format("DD/MM/YYYY HH:mm") : "-"}\n\n` +
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
      "/help - Show this help message\n\n" +
      "/rules - Show the rules\n"
  );
}
export async function sendStartPostMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard();
  keyboard
    .text("Menfess 🔮", "post_menfess")
    .text("Anon Message ✉️", "send_anon_message")
    .row()
    .text("« BACK", "back_to_main_menu");

  await ctx.editMessageText("Kamu ingin mengirim apa di Bulaksumur Base?", {
    reply_markup: keyboard,
  });
}

export async function sendReportFeedbackMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard();
  keyboard
    .text("Kritik 💭", "send_kritik")
    .text("Saran 💡", "send_saran")
    .text("Lapor ⚠️", "send_lapor")
    .row()
    .text("« BACK", "back_to_main_menu");

  await ctx.editMessageText("Apa hal yang ingin kamu sampaikan?", {
    reply_markup: keyboard,
  });
}

export async function sendSendAnonMessageMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard();
  keyboard.text("« BACK", "back_to_main_menu");

  await ctx.editMessageText(
    "✉️ Silahkan masukkan username dari user yang ingin kamu kirimkan pesan anonim!\n\n" +
      "Contoh: @username",
    {
      reply_markup: keyboard,
    }
  );
}

export async function sendViewProfileMenu(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("User tidak ditemukan.");
    return;
  }
  const userNameText = ctx.message?.text?.split("@")[1];
  if (!userNameText) {
    await ctx.reply(
      "Format username yang kamu masukkan tidak valid. Silahkan cek kembali username yang kamu masukkan."
    );
    return;
  }
  const userDb = await db
    .collection("users")
    .where("username", "==", userNameText?.toLowerCase())
    .limit(1)
    .get();
  if (userDb.empty || !userDb.docs[0]) {
    await ctx.reply("User tidak ditemukan.");
    return;
  }
  const userDoc = userDb.docs[0];
  const userDbData = {
    ...userDoc.data(),
    userId: Number(userDoc.id),
  } as UserDbData;

  const profileKeyboard = new InlineKeyboard()
    .row()
    .text("🚫 Block", `user_${userId}_block_${userDbData.userId}`)
    .text("⚠️ Report", `user_${userId}_report_${userDbData.userId}`)
    .row()
    .text("📩 Anon Message", `user_${userId}_send_anon_to_${userDbData.userId}`)
    .row()
    .url("👤 PROFILE", `https://t.me/${userDbData.username}`);

  // Format profile display text with dividers for better readability
  let profileText = `🔹 Profile\n@${userDbData.username}\n💬 --Placeholder for bio-- 💬\n\n`;
  profileText += `👤 Name : ${userDbData.anonName}\n`;
  profileText += `🧬 Sex : ${userDbData.gender === "M" ? "#M♂" : "#F♀"}\n`;
  // profileText += `📍 Location : -\n`;
  // profileText += `👀 Interest in : #DATING\n\n`;
  // profileText += `⭐ Popularities : ${userDbData.menfessCount || 0}\n`;
  // profileText += `🔍 Activities : ${userDbData.menfessCount > 0 ? Math.min(userDbData.menfessCount, 99) : 0}\n\n`;
  // profileText += `⚡ Score : ${(userDbData.menfessCount || 0) * 100}\n`;

  // Add warning/deleted info if available (placeholder for now)
  // profileText += `❌ Deleted : 0x\n`;
  // profileText += `⚠️ Warned : 0x\n\n`;

  // Add user ID and join information
  profileText += `🆔 ID : ${userDbData.userId}\n`;
  profileText += `@ Username : @${userDbData.username}\n`;

  // Format registration date
  const registeredDate = moment(userDbData.registeredAt.toDate());
  const formattedJoinDate = registeredDate.format("DD-MM-YYYY HH:mm");
  profileText += `🕒 Join time : ${formattedJoinDate}\n`;

  // Add a placeholder for last seen (can be updated with actual data later)
  // const lastSeen = moment().add(1, "year");
  // const formattedLastSeen = lastSeen.format("DD-MM-YYYY HH:mm");
  // profileText += `👁 Last Seen : ${formattedLastSeen}`;

  // Send the profile display
  await ctx.reply(profileText, {
    reply_markup: profileKeyboard,
  });
}
