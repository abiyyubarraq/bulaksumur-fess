import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { MONTH_NAMES } from "../utils/constants";
import { db } from "../utils/firebase";
import { isValidEmail, isValidName, matchCallbackData } from "../utils/helpers";
import type { BotContext, UserDbData } from "../utils/types";

// In-memory map to store last bot message IDs for each user
const lastBotMessages = new Map<number, number>();

/**
 * Initialize session and registration commands
 * @param bot The Telegram bot instance
 */
export function initSessionModule(bot: Bot<BotContext>): void {
  bot.on("message", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (userId === botConfig.telegramAdminId) {
      await next();
      return;
    }
    const username = ctx.from?.username;
    if (!username) {
      await ctx.reply(
        "⚠️ Username tidak ditemukan!\n\nSilahkan buat username Telegram terlebih dahulu untuk menggunakan bot ini.\n\nCara membuat username:\n\n1. Buka pengaturan Telegram\n2. Pilih menu 'Username'\n3. Buat username baru"
      );
      return;
    }

    if (ctx.session.isBanned) {
      await ctx.reply("Maaf, kamu tidak diizinkan mengirim menfess.");
      return;
    }

    if (ctx.session.isRegistered || ctx.session.registerStep === "complete") {
      await next();
      return;
    }

    if (!ctx.session.isRegistered) {
      // check is user on banned list coll
      const bannedUserDoc = await db
        .collection("bannedUsers")
        .doc(userId.toString())
        .get();
      if (bannedUserDoc.exists) {
        ctx.session.isBanned = true;
        await ctx.reply("Maaf, kamu tidak diizinkan mengirim menfess.");
        return;
      }
      // check db
      const userDoc = await db.collection("users").doc(userId.toString()).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserDbData;
        if (userData.isEmailVerified || userData.registerStep === "complete") {
          // assign to session
          ctx.session.isRegistered = true;
          ctx.session.registeredAt = userData.registeredAt.toDate();
          ctx.session.emailRegistered = userData.emailRegistered;
          ctx.session.gender = userData.gender;
          ctx.session.birthMonth = userData.birthMonth;
          ctx.session.birthYear = userData.birthYear;
          ctx.session.anonName = userData.anonName;
          ctx.session.registerStep = userData.registerStep;
          ctx.session.userId = userId;
          ctx.session.premiumStatus = userData.premiumStatus;
          ctx.session.premiumUntil = userData.premiumUntil?.toDate() || null;
          await next();
          return;
        }
      }
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
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1980 || year > currentYear - 15) {
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
          await sendBotMessage(
            "❌ Kode verifikasi tidak valid!\n\n" +
              "Silahkan masukkan kode 6 digit yang dikirim ke email yujiem kamu:"
          );
          return;
        }

        ctx.session.registerStep = "complete";
        ctx.session.isRegistered = true;
        ctx.session.registeredAt = new Date();

        lastBotMessages.delete(userId);
        await db.collection("users").doc(userId.toString()).set({
          username: username,
          emailRegistered: ctx.session.emailRegistered,
          gender: ctx.session.gender,
          birthMonth: ctx.session.birthMonth,
          birthYear: ctx.session.birthYear,
          registerStep: ctx.session.registerStep,
          isEmailVerified: true,
          registeredAt: ctx.session.registeredAt,
          anonName: ctx.session.anonName,
          premiumStatus: ctx.session.premiumStatus,
          premiumUntil: ctx.session.premiumUntil,
          menfessCount: 0,
        });
        await ctx.reply(
          "🎉 Selamat! Pendaftaran kamu telah berhasil! 🎉\n\n" +
            `Nama Anonym: ${ctx.session.anonName}\n` +
            `Email: ${ctx.session.emailRegistered}\n` +
            `Jenis Kelamin: ${ctx.session.gender === "M" ? "Laki-laki" : "Perempuan"}\n` +
            `Bulan Lahir: ${ctx.session.birthMonth ? MONTH_NAMES[ctx.session.birthMonth - 1] : ""}\n` +
            `Tahun Lahir: ${ctx.session.birthYear}\n\n` +
            "Sekarang kamu dapat menggunakan semua fitur Bulaksumur Menfess Bot.\n" +
            "Ketik /post untuk mulai mengirim menfess!"
        );
        break;

      default:
        ctx.session.registerStep = "anonName";
        await sendBotMessage(getProgressMessage(ctx, "anonName"));
        break;
    }
  });

  // Month selection handler
  bot.callbackQuery(/^month_(\d{1,2})$/, async (ctx) => {
    const userId = ctx.from.id;

    // Check if user has a username
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

    // Update or send new message with birth year prompt
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

    // Check if user has a username
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
    ctx.session.registerStep = "email";

    await ctx.answerCallbackQuery(
      `Gender ${gender === "M" ? "Male" : "Female"} selected`
    );

    // Update or send new message with email prompt
    const lastMessageId = lastBotMessages.get(userId);
    const progressMessage = getProgressMessage(ctx, "email");

    const emailKeyboard = new InlineKeyboard().text("❌ Reset", "reset_data");

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          lastMessageId,
          progressMessage,
          { reply_markup: emailKeyboard }
        );
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(progressMessage, {
            reply_markup: emailKeyboard,
          });
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(progressMessage, {
        reply_markup: emailKeyboard,
      });
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  // Confirmation and Reset data handlers
  bot.callbackQuery(/^confirm_data$/, async (ctx) => {
    const userId = ctx.from.id;

    // Check if user has a username
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

    // Update or send new message with email verification prompt
    const lastMessageId = lastBotMessages.get(userId);
    const verificationMessage =
      `✅ Kode verifikasi telah dikirim ke ${ctx.session.emailRegistered}\n\n` +
      "Silahkan masukkan kode verifikasi 6 digit:\n\n" +
      `(Untuk contoh ini, kode verifikasi: 312894)`;

    if (lastMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          lastMessageId,
          verificationMessage
        );
      } catch (error) {
        console.error("Error editing message:", error);
        if (ctx.chat) {
          const sentMessage = await ctx.reply(verificationMessage);
          lastBotMessages.set(userId, sentMessage.message_id);
        }
      }
    } else if (ctx.chat) {
      const sentMessage = await ctx.reply(verificationMessage);
      lastBotMessages.set(userId, sentMessage.message_id);
    }
  });

  bot.callbackQuery(/^reset_data$/, async (ctx) => {
    const userId = ctx.from.id;

    // Check if user has a username
    const username = ctx.from.username;
    if (!username) {
      await ctx.answerCallbackQuery({
        text: "Username tidak ditemukan! Silahkan buat username Telegram terlebih dahulu.",
        show_alert: true,
      });
      return;
    }

    // Reset all session data
    ctx.session.anonName = null;
    ctx.session.birthMonth = null;
    ctx.session.birthYear = null;
    ctx.session.gender = null;
    ctx.session.emailRegistered = null;
    ctx.session.registerStep = "anonName";

    await ctx.answerCallbackQuery(
      "Data reset, starting registration from beginning"
    );

    // Update or send new message with anonymous name prompt
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
}

/**
 * Generate registration progress message with appropriate checkmarks
 */
function getProgressMessage(
  ctx: BotContext,
  stage:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "email"
    | "confirmData"
    | "complete"
): string {
  let message = `${botConfig.botUserName} --Registrasi Member-\n\n`;

  // Add anonymous name if available
  if (ctx.session.anonName) {
    message += `Nama anonym: ${ctx.session.anonName} ✅\n`;
  }

  // Add birth month if available
  if (ctx.session.birthMonth && stage !== "anonName") {
    message += `Bulan lahir: ${MONTH_NAMES[ctx.session.birthMonth - 1]} ✅\n`;
  }

  // Add birth year if available
  if (ctx.session.birthYear && stage !== "anonName" && stage !== "birthMonth") {
    message += `Tahun lahir: ${ctx.session.birthYear} ✅\n`;
  }

  // Add gender if available
  if (
    ctx.session.gender &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear"
  ) {
    message += `Jenis kelamin: ${ctx.session.gender === "M" ? "Laki-laki 👦" : "Perempuan 👧"} ✅\n`;
  }

  // Add email if available
  if (
    ctx.session.emailRegistered &&
    stage !== "anonName" &&
    stage !== "birthMonth" &&
    stage !== "birthYear" &&
    stage !== "gender"
  ) {
    message += `Email: ${ctx.session.emailRegistered} ✅\n`;
  }

  // Add appropriate next prompt based on stage
  switch (stage) {
    case "anonName":
      message +=
        "Silahkan balas dengan Nama Anonym Kamu.\n" +
        "Nama anonym hanya boleh huruf abjad & angka saja dengan panjang 5-15 karakter:";
      break;
    case "birthMonth":
      message += "\nSilahkan pilih bulan lahir kamu:";
      break;
    case "birthYear":
      message += "\nSilahkan masukkan tahun lahir kamu (contoh: 2005):";
      break;
    case "gender":
      message += "\nSilahkan pilih jenis kelamin kamu:";
      break;
    case "email":
      message += "\nSilahkan masukkan alamat email yujiem kamu:";
      break;
    case "confirmData":
      message +=
        "\nSilahkan periksa data kamu di atas terutama email yujiem kamu, karena akan digunakan untuk verifikasi, dengan email yujiem yang salah kamu tidak akan bisa mengirim menfess dan berinteraksi dengan menfess lainnya. Apakah sudah benar?";
      break;
  }

  return message;
}
