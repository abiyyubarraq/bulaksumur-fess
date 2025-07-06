import { InlineKeyboard } from "grammy";
import moment from "moment";
import { AGREEMENTS, agreementFooter } from "../../../tosMenu";
import { botConfig } from "../../../utils/config";
import { MONTH_NAMES } from "../../../utils/constants";
import { db } from "../../../utils/firebase";
import { getPremiumBadge } from "../../../utils/premium.helpers";
import type { BotContext, UserDbData } from "../../../utils/types";

export const footer =
  `👪 Channel Base: @${botConfig.channelId.replace("@", "")}\n` +
  `👨‍💼 Admin Base: @${botConfig.adminBaseUserName}\n` +
  `👮‍♂️ Moderator Base: @${botConfig.moderatorBaseUserName}\n`;

const myData = (ctx: BotContext, userId: number) => {
  const bio = ctx.session.bio || "";
  const userName = ctx.from?.username || "-";
  const birthMonth =
    ctx.session.birthMonth && MONTH_NAMES[ctx.session.birthMonth - 1]
      ? MONTH_NAMES[ctx.session.birthMonth - 1]
      : "-";
  const birthYear = ctx.session.birthYear || "-";
  const premiumStatus = ctx.session.premiumStatus;
  const gender = ctx.session.gender || "-";
  const anonName = ctx.session.anonName || "-";
  const faculty = ctx.session.faculty;
  const univYear = ctx.session.univYear;
  const emailRegistered = ctx.session.emailRegistered;
  const registeredAt = ctx.session.registeredAt;
  const premiumUntil = ctx.session.premiumUntil;
  const dailyGoldQuota = ctx.session.dailyGoldQuota;

  return (
    `<blockquote>${bio}</blockquote>\n\n` +
    `👽 Name : @${userName}${getPremiumBadge(premiumStatus)}\n` +
    `👤 AnonName : ${anonName}\n` +
    `🚹 Sex : ${gender === "M" ? "#M♂" : "#F♀"}\n` +
    `👶 Birth : ${birthMonth} ${birthYear}\n` +
    `🏠 Faculty : ${faculty}\n` +
    `🎓 Univ Year : ${univYear}\n` +
    `💌 Email : ${emailRegistered}\n` +
    // `⚡ Score : ${1000}\n` +
    `💰 Gold : ${dailyGoldQuota}\n\n` +
    `🆔 ID : ${userId}\n` +
    `⏱️ Join time : ${registeredAt ? moment(registeredAt).format("DD/MM/YYYY HH:mm") : "-"}\n\n` +
    `📅 Premium until : ${premiumUntil ? moment(premiumUntil).format("DD/MM/YYYY HH:mm") : "-"}\n\n`
  );
};

export async function sendMainMenu(ctx: BotContext, isBack: boolean = false) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const keyboard = new InlineKeyboard();

  keyboard
    .text("Kritik, Saran, Lapor 🗞️", "report_feedback")
    .row()
    .text("Profile 👤", "view_my_profile")
    // .text("Inbox 📬", "view_inbox")
    .row()
    // .text("Riwayat 🌟", "view_history")
    .text("Beli 🛒", "purchase_premium")
    .row()
    .text("Bantuan ❓", "get_help")
    .text("Peraturan 📜", "view_rules")
    .row()
    .text("Kirim ▶️", "start_post");

  const messageText = myData(ctx, userId) + footer;

  if (isBack) {
    await ctx.editMessageText(messageText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } else {
    await ctx.reply(messageText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }
}

export const viewMyProfileMenu = async (ctx: BotContext) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const keyboard = new InlineKeyboard()
    // .text("Statistic 📊", "view_my_statistic")
    .text("Setting ⚙️", "view_my_settings")
    .row()
    .text("« BACK", "back_to_main_menu");
  await ctx.editMessageText(myData(ctx, userId), {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
};

export async function sendRulesMenu(ctx: BotContext) {
  await ctx.reply(AGREEMENTS[1].content + agreementFooter, {
    parse_mode: "HTML",
  });
  await ctx.reply(AGREEMENTS[2].content + agreementFooter, {
    parse_mode: "HTML",
  });
  await ctx.reply(AGREEMENTS[3].content + agreementFooter, {
    parse_mode: "HTML",
  });
}

export async function sendBuyPremiumMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text("💰 Premium 💎💎💎", "purchase_premium_member")
    .row()
    .text("« BACK", "back_to_main_menu");
  await ctx.reply("Silahkan pilih apa yang ingin kamu beli 💹🤔", {
    reply_markup: keyboard,
  });
}

export async function sendHelpMenu(ctx: BotContext) {
  await ctx.reply(
    "Bulaksumur Menfess Bot Commands:\n\n" +
      "/menu - Get the main menu\n" +
      "/help - Show this help message\n" +
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

  await ctx.editMessageText("🫡 Apa hal yang ingin kamu sampaikan?", {
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
    await ctx.reply("😔 User tidak ditemukan.");
    return;
  }
  const messageId = ctx.message?.message_id;
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
    await ctx.reply("😔 User tidak ditemukan.", {
      reply_to_message_id: messageId,
    });
    return;
  }
  const userDoc = userDb.docs[0];
  const userDbData = {
    ...userDoc.data(),
    userId: Number(userDoc.id),
  } as UserDbData;

  const profileKeyboard = new InlineKeyboard()
    // .row()
    // .text("🚫 Block", `user_${userId}_block_${userDbData.userId}_${userDbData.username}`)
    .text(
      "📩 Anon Message",
      `anon_mess_${userDbData.userId}_${userDbData.username}_true_false`
    )
    .row()
    .text("⚠️ Report", `user_report_${userDbData.userId}_${userDbData.username}`)
    .url("👤 PROFILE", `tg://user?id=${userDbData.userId}`);

  // Format profile display text with dividers for better readability
  let profileText = `<blockquote>${userDbData.bio}</blockquote>\n\n`;
  if (userDbData.isBanned) {
    profileText += `🚫 Waspada user ini telah dibanned! 🚫\n`;
  }
  profileText += `👤 Name : ${userDbData.anonName}${getPremiumBadge(userDbData.premiumStatus)}\n`;
  profileText += `🧬 Sex : ${userDbData.gender === "M" ? "🕺 #M♂" : "💃 #F♀"}\n`;
  // profileText += `📍 Location : -\n`;
  // profileText += `👀 Interest in : #DATING\n\n`;
  // profileText += `⭐ Popularities : ${userDbData.menfessCount || 0}\n`;
  // profileText += `🔍 Activities : ${userDbData.menfessCount > 0 ? Math.min(userDbData.menfessCount, 99) : 0}\n\n`;
  // profileText += `⚡ Score : ${(userDbData.menfessCount || 0) * 100}\n`;

  // Add warning/deleted info if available (placeholder for now)
  profileText += `❌ Deleted : ${userDbData.deletedCount || 0}\n`;
  profileText += `⚠️ Warned : ${userDbData.warnedCount || 0}\n\n`;

  // Add user ID and join information
  profileText += `🆔 ID : ${userDbData.userId}\n`;

  // Format registration date
  const registeredDate = moment(userDbData.registeredAt.toDate());
  const formattedJoinDate = registeredDate.format("DD-MM-YYYY HH:mm");
  profileText += `🕒 Join time : ${formattedJoinDate}\n`;

  // Add a placeholder for last seen (can be updated with actual data later)
  // const lastSeen = moment().add(1, "year");
  // const formattedLastSeen = lastSeen.format("DD-MM-YYYY HH:mm");
  // profileText += `👁 Last Seen : ${formattedLastSeen}`;

  profileText += `\n${footer}`;

  // Send the profile display
  await ctx.reply(profileText, {
    reply_markup: profileKeyboard,
    parse_mode: "HTML",
    reply_to_message_id: messageId,
  });
}
