import { Bot, InlineKeyboard } from "grammy";

import type { ParseModeFlavor } from "@grammyjs/parse-mode";

import moment from "moment";
import { botConfig } from "../utils/config";
import { MONTH_NAMES } from "../utils/constants";
import { db } from "../utils/firebase";
import {
  isChatFromUserToGroup,
  isForwardedMenfessFromChannelToGroup,
  isValidEmail,
  isValidName,
  matchCallbackData,
} from "../utils/helpers";
import type { BotContext, UserDbData } from "../utils/types";

const lastBotMessages = new Map<number, number>();

const FACULTY_LIST = [
  "FMIPA",
  "FISIPOL",
  "FEB",
  "FBIO",
  "FFIL",
  "FFARM",
  "FGEO",
  "FH",
  "FIB",
  "FKKMK",
  "FKG",
  "FKH",
  "FKT",
  "FTP",
  "FAPET",
  "FAPERTA",
  "FPSIKO",
  "FT",
  "SV",
  "PASCA",
];

export function initSessionModule(bot: Bot<ParseModeFlavor<BotContext>>): void {
  bot.on("callback_query:data", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const username = ctx.from?.username;

    if (!username) {
      await ctx.answerCallbackQuery(
        "⚠️ Username tidak ditemukan! 🔔 Silahkan buat username Telegram terlebih dahulu untuk menggunakan bot ini."
      );
      return;
    } else if (ctx.session.isBanned) {
      await ctx.answerCallbackQuery(
        "❌ Maaf, kamu tidak diizinkan mengirim menfess. 🚫"
      );
      return;
    }

    const memberStatus = await ctx.api.getChatMember(
      botConfig.channelId,
      userId
    );

    if (
      memberStatus.status === "left" ||
      memberStatus.status === "kicked" ||
      memberStatus.status === "restricted"
    ) {
      await ctx.answerCallbackQuery(
        `⚠️ Maaf, kamu belum join ke channel 🔔 Silahkan join ke channel ${botConfig.channelId} terlebih dahulu.`
      );
      return;
    }

    if (!ctx.session.isRegistered || !ctx.session.lastUserUpdatedDataWithDb) {
      const bannedUserDoc = await db
        .collection("bannedUsers")
        .doc(userId.toString())
        .get();
      if (bannedUserDoc.exists) {
        ctx.session.isBanned = true;
        ctx.session.isRegistered = false;
        await ctx.answerCallbackQuery(
          "❌ Maaf, kamu tidak diizinkan mengirim menfess. 🚫"
        );
        return;
      }

      const userDoc = await db.collection("users").doc(userId.toString()).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserDbData;
        if (
          ["complete", "agreement1", "agreement2", "agreement3"].includes(
            userData.registerStep
          )
        ) {
          ctx.session.isRegistered = true;
          ctx.session.registeredAt = userData.registeredAt.toDate();
          ctx.session.emailRegistered = userData.emailRegistered;
          ctx.session.gender = userData.gender;
          ctx.session.birthMonth = userData.birthMonth;
          ctx.session.birthYear = userData.birthYear;
          ctx.session.anonName = userData.anonName;
          ctx.session.faculty = userData.faculty;
          ctx.session.univYear = userData.univYear;
          ctx.session.bio = userData.bio;
          ctx.session.registerStep = userData.registerStep;
          ctx.session.userId = userId;
          ctx.session.premiumStatus = userData.premiumStatus;
          ctx.session.premiumUntil = userData.premiumUntil?.toDate() || null;
          ctx.session.lastUserUpdatedDataWithDb = new Date();
          await next();
          return;
        }
      }
    }

    if (ctx.session.registerStep !== "complete") {
      const callbackQueryAllowed = [
        "agreement_agree_",
        "disagree_agreement_",
        "month_",
        "gender_",
        "faculty_",
        "reset_data",
        "reset_email_data",
        "confirm_data",
      ];

      const isAllowed = callbackQueryAllowed.some((allowed) =>
        ctx.callbackQuery.data.startsWith(allowed)
      );
      if (isAllowed) {
        await next();
        return;
      }

      await ctx.answerCallbackQuery(
        "⚠️ Maaf, kamu belum melakukan pendaftaran atau belum menyetujui peraturan dan ketentuan base yang berlaku."
      );
      return;
    } else {
      await next();
      return;
    }
  });

  bot.on("message", async (ctx, next) => {
    if (isChatFromUserToGroup(ctx)) {
      if (isForwardedMenfessFromChannelToGroup(ctx)) {
        await next();
        return;
      } else {
        return;
      }
    }
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username;
    if (!username) {
      await ctx.reply(
        "⚠️ Username tidak ditemukan! ❌\n\n" +
          "🔔 Silahkan buat username Telegram terlebih dahulu untuk menggunakan bot ini.\n\n" +
          "📝 Cara membuat username:\n\n" +
          "1️⃣ Buka pengaturan Telegram ⚙️\n" +
          "2️⃣ Pilih menu 'Username' 👤\n" +
          "3️⃣ Buat username baru ✨"
      );
      return;
    }

    if (ctx.session.isBanned) {
      ctx.session.isRegistered = false;
      await ctx.reply(
        "❌ Maaf, kamu tidak diizinkan berinteraksi dengan bot ini. 🚫"
      );
      return;
    }

    const memberStatus = await ctx.api.getChatMember(
      botConfig.channelId,
      userId
    );

    if (
      memberStatus.status === "left" ||
      memberStatus.status === "kicked" ||
      memberStatus.status === "restricted"
    ) {
      ctx.session.isRegistered = false;
      await ctx.reply(
        `⚠️ Maaf, kamu belum join ke channel\n\n🔔 Silahkan join ke channel ${botConfig.channelId} terlebih dahulu.`
      );
      return;
    }

    if (ctx.session.isRegistered || ctx.session.registerStep === "complete") {
      await next();
      return;
    }

    if (!ctx.session.isRegistered || !ctx.session.lastUserUpdatedDataWithDb) {
      const bannedUserDoc = await db
        .collection("bannedUsers")
        .doc(userId.toString())
        .get();
      if (bannedUserDoc.exists) {
        ctx.session.isBanned = true;
        ctx.session.isRegistered = false;
        await ctx.reply("❌ Maaf, kamu tidak diizinkan mengirim menfess. 🚫");
        return;
      }

      const userDoc = await db.collection("users").doc(userId.toString()).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserDbData;
        if (
          ["complete", "agreement1", "agreement2", "agreement3"].includes(
            userData.registerStep
          )
        ) {
          ctx.session.isRegistered = true;
          ctx.session.registeredAt = userData.registeredAt.toDate();
          ctx.session.emailRegistered = userData.emailRegistered;
          ctx.session.gender = userData.gender;
          ctx.session.birthMonth = userData.birthMonth;
          ctx.session.birthYear = userData.birthYear;
          ctx.session.anonName = userData.anonName;
          ctx.session.faculty = userData.faculty;
          ctx.session.univYear = userData.univYear;
          ctx.session.bio = userData.bio;
          ctx.session.registerStep = userData.registerStep;
          ctx.session.userId = userId;
          ctx.session.premiumStatus = userData.premiumStatus;
          ctx.session.premiumUntil = userData.premiumUntil?.toDate() || null;
          ctx.session.lastUserUpdatedDataWithDb = new Date();
          await next();
          return;
        }
      }
    }

    if (userId === botConfig.telegramAdminId) {
      await next();
      return;
    }

    const messageText = ctx.message?.text || "";

    async function sendBotMessage(
      text: string,
      keyboard?: InlineKeyboard
    ): Promise<void> {
      const lastMessageId = lastBotMessages.get(userId);
      if (lastMessageId) {
        try {
          await ctx.api.editMessageText(ctx.chat.id, lastMessageId, "...");
        } catch (error) {
          console.error("Error editing message:", error);
        }
      }

      const options = keyboard ? { reply_markup: keyboard } : undefined;
      const sentMessage = await ctx.reply(text, options);
      lastBotMessages.set(userId, sentMessage.message_id);
    }

    switch (ctx.session.registerStep) {
      case "anonName":
        if (!messageText) {
          await sendBotMessage(getProgressMessage(ctx, "anonName"));
          return;
        }

        if (!isValidName(messageText)) {
          await sendBotMessage(getProgressMessage(ctx, "anonName"));
          return;
        }

        ctx.session.anonName = messageText;
        ctx.session.registerStep = "birthMonth";
        ctx.session.userId = userId;

        const monthKeyboard = new InlineKeyboard()
          .text("Jan", "month_1")
          .text("Feb", "month_2")
          .text("Mar", "month_3")
          .text("Apr", "month_4")
          .row()
          .text("May", "month_5")
          .text("Jun", "month_6")
          .text("Jul", "month_7")
          .text("Aug", "month_8")
          .row()
          .text("Sep", "month_9")
          .text("Oct", "month_10")
          .text("Nov", "month_11")
          .text("Dec", "month_12")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "birthMonth"),
          monthKeyboard
        );
        break;

      case "birthMonth":
        const resendMonthKeyboard = new InlineKeyboard()
          .text("Jan", "month_1")
          .text("Feb", "month_2")
          .text("Mar", "month_3")
          .text("Apr", "month_4")
          .row()
          .text("May", "month_5")
          .text("Jun", "month_6")
          .text("Jul", "month_7")
          .text("Aug", "month_8")
          .row()
          .text("Sep", "month_9")
          .text("Oct", "month_10")
          .text("Nov", "month_11")
          .text("Dec", "month_12")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "birthMonth"),
          resendMonthKeyboard
        );
        break;

      case "birthYear":
        if (!messageText) {
          const birthYearKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(
            getProgressMessage(ctx, "birthYear"),
            birthYearKeyboard
          );
          return;
        }

        const year = parseInt(messageText);
        const currentYear = moment().year();
        if (isNaN(year) || year < 1980 || year > currentYear - 17) {
          const birthYearKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(
            getProgressMessage(ctx, "birthYear"),
            birthYearKeyboard
          );
          return;
        }

        ctx.session.birthYear = year;
        ctx.session.registerStep = "gender";

        const genderKeyboard = new InlineKeyboard()
          .text("👦 Laki-laki (M)", "gender_M")
          .text("👧 Perempuan (F)", "gender_F")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(getProgressMessage(ctx, "gender"), genderKeyboard);
        break;

      case "gender":
        const resendGenderKeyboard = new InlineKeyboard()
          .text("👦 Laki-laki (M)", "gender_M")
          .text("👧 Perempuan (F)", "gender_F")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "gender"),
          resendGenderKeyboard
        );
        break;

      case "bio":
        if (!messageText) {
          const bioKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(getProgressMessage(ctx, "bio"), bioKeyboard);
          return;
        }

        if (messageText.length > 200 || messageText.length < 5) {
          const bioKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(
            "❌ Karakter bio harus di antara 5 dan 200 karakter.\n\n" +
              getProgressMessage(ctx, "bio"),
            bioKeyboard
          );
          return;
        }

        ctx.session.bio = messageText;
        ctx.session.registerStep = "faculty";

        const facultyKeyboard = new InlineKeyboard()
          .text("FMIPA", "faculty_FMIPA")
          .text("FISIPOL", "faculty_FISIPOL")
          .text("FEB", "faculty_FEB")
          .row()
          .text("FBIO", "faculty_FBIO")
          .text("FFIL", "faculty_FFIL")
          .text("FFARM", "faculty_FFARM")
          .row()
          .text("FGEO", "faculty_FGEO")
          .text("FH", "faculty_FH")
          .text("FIB", "faculty_FIB")
          .row()
          .text("FKKMK", "faculty_FKKMK")
          .text("FKG", "faculty_FKG")
          .text("FKH", "faculty_FKH")
          .row()
          .text("FKT", "faculty_FKT")
          .text("FTP", "faculty_FTP")
          .text("FAPET", "faculty_FAPET")
          .row()
          .text("FAPERTA", "faculty_FAPERTA")
          .text("FPSIKO", "faculty_FPSIKO")
          .text("FT", "faculty_FT")
          .row()
          .text("SV", "faculty_SV")
          .text("PASCA", "faculty_PASCA")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "faculty"),
          facultyKeyboard
        );
        break;

      case "faculty":
        const resendFacultyKeyboard = new InlineKeyboard()
          .text("FMIPA", "faculty_FMIPA")
          .text("FISIPOL", "faculty_FISIPOL")
          .text("FEB", "faculty_FEB")
          .row()
          .text("FBIO", "faculty_FBIO")
          .text("FFIL", "faculty_FFIL")
          .text("FFARM", "faculty_FFARM")
          .row()
          .text("FGEO", "faculty_FGEO")
          .text("FH", "faculty_FH")
          .text("FIB", "faculty_FIB")
          .row()
          .text("FKKMK", "faculty_FKKMK")
          .text("FKG", "faculty_FKG")
          .text("FKH", "faculty_FKH")
          .row()
          .text("FKT", "faculty_FKT")
          .text("FTP", "faculty_FTP")
          .text("FAPET", "faculty_FAPET")
          .row()
          .text("FAPERTA", "faculty_FAPERTA")
          .text("FPSIKO", "faculty_FPSIKO")
          .text("FT", "faculty_FT")
          .row()
          .text("SV", "faculty_SV")
          .text("PASCA", "faculty_PASCA")
          .row()
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "faculty"),
          resendFacultyKeyboard
        );
        break;

      case "univYear":
        if (!messageText) {
          const univYearKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(
            getProgressMessage(ctx, "univYear"),
            univYearKeyboard
          );
          return;
        }

        const univYear = parseInt(messageText);
        const univCurrentYear = moment().year();
        if (isNaN(univYear) || univYear <= 2000 || univYear > univCurrentYear) {
          const univYearKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(
            "❌ Tahun angkatan tidak valid! Harus di antara 2001 dan " +
              univCurrentYear +
              ".\n\n" +
              getProgressMessage(ctx, "univYear"),
            univYearKeyboard
          );
          return;
        }

        ctx.session.univYear = univYear;
        ctx.session.registerStep = "email";

        const emailKeyboard = new InlineKeyboard().text(
          "❌ Reset",
          "reset_data"
        );

        await sendBotMessage(getProgressMessage(ctx, "email"), emailKeyboard);
        break;

      case "email":
        if (!messageText) {
          const emailKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(getProgressMessage(ctx, "email"), emailKeyboard);
          return;
        }

        if (!isValidEmail(messageText)) {
          const emailKeyboard = new InlineKeyboard().text(
            "❌ Reset",
            "reset_data"
          );

          await sendBotMessage(getProgressMessage(ctx, "email"), emailKeyboard);
          return;
        }

        ctx.session.emailRegistered = messageText;
        ctx.session.registerStep = "confirmData";

        const confirmKeyboard = new InlineKeyboard()
          .text("✅ Konfirmasi", "confirm_data")
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "confirmData"),
          confirmKeyboard
        );
        break;

      case "confirmData":
        const resendConfirmKeyboard = new InlineKeyboard()
          .text("✅ Konfirmasi", "confirm_data")
          .text("❌ Reset", "reset_data");

        await sendBotMessage(
          getProgressMessage(ctx, "confirmData"),
          resendConfirmKeyboard
        );
        break;

      case "verifyEmail":
        if (!messageText) {
          await sendBotMessage(
            "Silahkan masukkan kode verifikasi yang dikirim ke email yujiem kamu:"
          );
          return;
        }

        if (!/^\d{6}$/.test(messageText)) {
          const emailKeyboard = new InlineKeyboard().text(
            "❌ Reset Email",
            "reset_email_data"
          );
          await sendBotMessage(
            "❌ Kode verifikasi tidak valid!\n\n" +
              "Silahkan masukkan kode 6 digit yang dikirim ke email yujiem kamu:",
            emailKeyboard
          );
          return;
        }

        ctx.session.registerStep = "agreement1";
        ctx.session.isRegistered = true;
        ctx.session.registeredAt = new Date();

        lastBotMessages.delete(userId);
        await db.collection("users").doc(userId.toString()).set({
          username: username,
          emailRegistered: ctx.session.emailRegistered,
          gender: ctx.session.gender,
          birthMonth: ctx.session.birthMonth,
          birthYear: ctx.session.birthYear,
          bio: ctx.session.bio,
          faculty: ctx.session.faculty,
          univYear: ctx.session.univYear,
          registerStep: ctx.session.registerStep,
          isEmailVerified: true,
          registeredAt: ctx.session.registeredAt,
          anonName: ctx.session.anonName,
          premiumStatus: ctx.session.premiumStatus,
          premiumUntil: ctx.session.premiumUntil,
          menfessCount: 0,
        });
        await ctx.reply(
          "🎉✨ Selamat! Pendaftaran kamu telah berhasil! 🎊🎈\n\n" +
            `👤 Nama Anonym: ${ctx.session.anonName}\n` +
            `📧 Email: ${ctx.session.emailRegistered}\n` +
            `⚧️ Jenis Kelamin: ${ctx.session.gender === "M" ? "Laki-laki 👨" : "Perempuan 👩"}\n` +
            `📅 Bulan Lahir: ${ctx.session.birthMonth ? MONTH_NAMES[ctx.session.birthMonth - 1] : ""}\n` +
            `🗓️ Tahun Lahir: ${ctx.session.birthYear}\n` +
            `📝 Bio: ${ctx.session.bio || "-"}\n` +
            `🏫 Fakultas: ${ctx.session.faculty || "-"}\n` +
            `🎓 Tahun Angkatan: ${ctx.session.univYear || "-"}\n\n` +
            `📏 Sekarang kamu perlu membaca, memahami, dan menyetujui beberapa ketentuan dan peraturan dari BOT ${botConfig.botUserName} dan channel ${botConfig.channelId}.\nKetik /menu untuk melihat peraturan dan ketentuan base yang berlaku.`
        );
        break;

      default:
        ctx.session.registerStep = "anonName";
        await sendBotMessage(getProgressMessage(ctx, "anonName"));
        break;
    }
  });

  bot.callbackQuery(/^month_(\d{1,2})$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    const monthMatch = matchCallbackData(
      /^month_(\d{1,2})$/,
      ctx.callbackQuery.data
    );

    if (!monthMatch) {
      await ctx.answerCallbackQuery("Invalid month selection");
      return;
    }

    const month = parseInt(monthMatch[1] as string);
    if (month < 1 || month > 12) {
      await ctx.answerCallbackQuery("Invalid month");
      return;
    }

    ctx.session.birthMonth = month;
    ctx.session.registerStep = "birthYear";

    await ctx.answerCallbackQuery(`Month ${month} selected`);

    const lastMessageId = lastBotMessages.get(userId);
    const progressMessage = getProgressMessage(ctx, "birthYear");

    const birthYearKeyboard = new InlineKeyboard().text(
      "❌ Reset",
      "reset_data"
    );

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          lastMessageId,
          progressMessage,
          { reply_markup: birthYearKeyboard }
        );
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(progressMessage, {
            reply_markup: birthYearKeyboard,
          });
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(progressMessage, {
        reply_markup: birthYearKeyboard,
      });
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  bot.callbackQuery(/^gender_(M|F)$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    const genderMatch = matchCallbackData(
      /^gender_(M|F)$/,
      ctx.callbackQuery.data
    );

    if (!genderMatch) {
      await ctx.answerCallbackQuery("Invalid gender selection");
      return;
    }

    const gender = genderMatch[1] as "M" | "F";

    ctx.session.gender = gender;
    ctx.session.registerStep = "bio";

    await ctx.answerCallbackQuery(
      `Gender ${gender === "M" ? "Male" : "Female"} selected`
    );

    const lastMessageId = lastBotMessages.get(userId);
    const progressMessage = getProgressMessage(ctx, "bio");

    const bioKeyboard = new InlineKeyboard().text("❌ Reset", "reset_data");

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          lastMessageId,
          progressMessage,
          { reply_markup: bioKeyboard }
        );
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(progressMessage, {
            reply_markup: bioKeyboard,
          });
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(progressMessage, {
        reply_markup: bioKeyboard,
      });
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  bot.callbackQuery(/^confirm_data$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    ctx.session.registerStep = "verifyEmail";

    await ctx.answerCallbackQuery("Data confirmed");
    const lastMessageId = lastBotMessages.get(userId);
    const keyboard = new InlineKeyboard().text(
      "❌ Reset Email",
      "reset_email_data"
    );
    const verificationMessage =
      `📧 Kode verifikasi telah dikirim ke ${ctx.session.emailRegistered}\n\n` +
      "Silahkan masukkan kode verifikasi 6 digit:\n\n" +
      `(Untuk contoh ini, kode verifikasi: 312894)`;

    if (ctx.chat) {
      if (lastMessageId) {
        try {
          await ctx.api.editMessageText(
            ctx.chat.id,
            lastMessageId,
            verificationMessage,
            { reply_markup: keyboard }
          );
        } catch (error) {
          console.error("Error editing message:", error);
          if (ctx.chat) {
            const sentMessage = await ctx.reply(verificationMessage, {
              reply_markup: keyboard,
            });
            lastBotMessages.set(userId, sentMessage.message_id);
          }
        }
      } else {
        const sentMessage = await ctx.reply(verificationMessage, {
          reply_markup: keyboard,
        });
        lastBotMessages.set(userId, sentMessage.message_id);
      }
    }
  });

  bot.callbackQuery(/^reset_email_data$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }
    ctx.session.emailRegistered = null;
    ctx.session.registerStep = "email";

    const lastMessageId = lastBotMessages.get(userId);
    const resetMessage = getProgressMessage(ctx, "email");

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(ctx.chat.id, lastMessageId, resetMessage);
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(resetMessage);
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(resetMessage);
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  bot.callbackQuery(/^reset_data$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    ctx.session.anonName = null;
    ctx.session.birthMonth = null;
    ctx.session.birthYear = null;
    ctx.session.gender = null;
    ctx.session.bio = null;
    ctx.session.faculty = null;
    ctx.session.univYear = null;
    ctx.session.emailRegistered = null;
    ctx.session.registerStep = "anonName";

    await ctx.answerCallbackQuery(
      "Berhasil mereset data registrasi, silahkan mulai lagi dari awal. ➿"
    );

    const lastMessageId = lastBotMessages.get(userId);
    const resetMessage = getProgressMessage(ctx, "anonName");

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(ctx.chat.id, lastMessageId, resetMessage);
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(resetMessage);
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(resetMessage);
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  bot.callbackQuery(/^faculty_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;

    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    const facultyMatch = matchCallbackData(
      /^faculty_(.+)$/,
      ctx.callbackQuery.data
    );

    if (!facultyMatch || !facultyMatch[1]) {
      await ctx.answerCallbackQuery("Invalid faculty selection");
      return;
    }

    const faculty = facultyMatch[1];
    if (!FACULTY_LIST.includes(faculty)) {
      await ctx.answerCallbackQuery("Invalid faculty");
      return;
    }

    ctx.session.faculty = faculty;
    ctx.session.registerStep = "univYear";

    await ctx.answerCallbackQuery(`Faculty ${faculty} selected`);

    const lastMessageId = lastBotMessages.get(userId);
    const progressMessage = getProgressMessage(ctx, "univYear");

    const univYearKeyboard = new InlineKeyboard().text(
      "❌ Reset",
      "reset_data"
    );

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          lastMessageId,
          progressMessage,
          { reply_markup: univYearKeyboard }
        );
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(progressMessage, {
            reply_markup: univYearKeyboard,
          });
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(progressMessage, {
        reply_markup: univYearKeyboard,
      });
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });
}

function getProgressMessage(
  ctx: ParseModeFlavor<BotContext>,
  stage:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "bio"
    | "faculty"
    | "univYear"
    | "email"
    | "confirmData"
    | "complete"
): string {
  let message = `${botConfig.botUserName} --Registrasi Member-\n\n`;

  if (ctx.session.anonName) {
    message += `Nama anonym: ${ctx.session.anonName} ✅\n`;
  }

  if (ctx.session.birthMonth && stage !== "anonName") {
    message += `Bulan lahir: ${MONTH_NAMES[ctx.session.birthMonth - 1]} ✅\n`;
  }

  if (ctx.session.birthYear && stage !== "anonName" && stage !== "birthMonth") {
    message += `Tahun lahir: ${ctx.session.birthYear} ✅\n`;
  }

  if (
    ctx.session.gender &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear"
  ) {
    message += `Jenis kelamin: ${ctx.session.gender === "M" ? "Laki-laki 👦" : "Perempuan 👧"} ✅\n`;
  }

  if (
    ctx.session.bio &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear" &&
    stage !== "gender"
  ) {
    message += `Bio: ${ctx.session.bio} ✅\n`;
  }

  if (
    ctx.session.faculty &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear" &&
    stage !== "gender" &&
    stage !== "bio"
  ) {
    message += `Fakultas: ${ctx.session.faculty} ✅\n`;
  }

  if (
    ctx.session.univYear &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear" &&
    stage !== "gender" &&
    stage !== "bio" &&
    stage !== "faculty"
  ) {
    message += `Tahun Angkatan: ${ctx.session.univYear} ✅\n`;
  }

  if (
    ctx.session.emailRegistered &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear" &&
    stage !== "gender" &&
    stage !== "bio" &&
    stage !== "faculty" &&
    stage !== "univYear"
  ) {
    message += `Email: ${ctx.session.emailRegistered} ✅\n`;
  }

  switch (stage) {
    case "anonName":
      message +=
        "🎭 Silahkan balas dengan Nama Anonym Kamu.\n" +
        "Nama anonym hanya boleh huruf abjad & angka saja dengan panjang 5-15 karakter:";
      break;
    case "birthMonth":
      message += "\n📅 Silahkan pilih bulan lahir kamu:";
      break;
    case "birthYear":
      message += "\n🕰️ Silahkan masukkan tahun lahir kamu (contoh: 2005):";
      break;
    case "gender":
      message += "\n♀️♂️ Silahkan pilih jenis kelamin kamu:";
      break;
    case "bio":
      message +=
        "\n📝 Silahkan masukkan bio singkat tentang dirimu (maks. 200 karakter, minimal 5 karakter):";
      break;
    case "faculty":
      message += "\n🏫 Silahkan pilih fakultas kamu:";
      break;
    case "univYear":
      message += "\n🎓 Silahkan masukkan tahun angkatan kamu (contoh: 2023):";
      break;
    case "email":
      message +=
        "\n📬 Silahkan masukkan alamat email yujiem kamu (contoh: yujiem@mail.ugm.ac.id):";
      break;
    case "confirmData":
      message +=
        "\n👀 Silahkan periksa data kamu di atas terutama email yujiem kamu, karena akan digunakan untuk verifikasi, dengan email yujiem yang salah kamu tidak akan bisa mengirim menfess dan berinteraksi dengan menfess lainnya. Apakah sudah benar?";
      break;
  }

  return message;
}
