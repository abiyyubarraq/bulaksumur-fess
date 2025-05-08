import { Bot, InlineKeyboard } from "grammy";
import { formatDateFromTimestamp, isValidEmail } from "../utils/helpers";
import {
  createUserSession,
  getUserSession,
  isUserRegistered,
  updateUserSession,
} from "../utils/services";
import { SessionStatus } from "../utils/types";

// Session context to store temporary user data
type RegistrationContext = {
  step: "name" | "email" | "complete";
  data: {
    name?: string;
    email?: string;
  };
};

// Map to store in-memory registration progress
const registrationProcesses = new Map<number, RegistrationContext>();

/**
 * Initialize session and registration commands
 * @param bot The Telegram bot instance
 */
export function initSessionModule(bot: Bot): void {
  // Profile command
  // bot.command("profile", async (ctx) => {
  //   const userId = ctx.from?.id;
  //   if (!userId) return;

  //   const session = await getUserSession(userId);

  //   if (!session || session.status !== SessionStatus.REGISTERED) {
  //     const keyboard = new InlineKeyboard().text(
  //       "Daftar Sekarang",
  //       "start_registration"
  //     );
  //     await ctx.reply(
  //       "Anda belum terdaftar. Silahkan daftar terlebih dahulu untuk menggunakan bot ini.",
  //       {
  //         reply_markup: keyboard,
  //       }
  //     );
  //     return;
  //   }

  //   await ctx.reply(
  //     `📋 *Profil Pengguna*\n\n` +
  //       `ID: \`${session.userId}\`\n` +
  //       `Username: @${session.username || "tidak diatur"}\n` +
  //       `Status: Terdaftar ✅\n` +
  //       `Terdaftar pada: ${formatDateFromTimestamp(session.registeredAt)}\n`,
  //     {
  //       parse_mode: "Markdown",
  //     }
  //   );
  // });

  // Handle registration callback
  bot.callbackQuery("start_registration", async (ctx) => {
    await ctx.answerCallbackQuery();

    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    if (!userId) return;

    // Start registration process
    registrationProcesses.set(userId, {
      step: "name",
      data: {},
    });

    await createUserSession(
      userId,
      SessionStatus.REGISTRATION_IN_PROGRESS,
      username
    );

    await ctx.reply(
      "🌟 Selamat datang di proses pendaftaran Bulaksumur Menfess! 🌟\n\n" +
        "Silahkan balas dengan Nama Anonym Kamu.\n" +
        "Nama anonym hanya boleh huruf abjad & angka saja dengan panjang 5-15 karakter:",
      {
        reply_markup: { force_reply: true },
      }
    );
  });

  // Handle registration replies
  bot.on("message:text", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const replyToMessage = ctx.message.reply_to_message;

    // Check if this is a reply to a registration prompt
    if (!replyToMessage) return;

    // Only handle if user is in registration process
    const registration = registrationProcesses.get(userId);
    if (!registration) return;

    // Get user session to verify status
    const session = await getUserSession(userId);
    if (!session || session.status !== SessionStatus.REGISTRATION_IN_PROGRESS)
      return;

    const text = ctx.message.text;

    if (registration.step === "name") {
      // Validate name: alphanumeric only, 5-15 characters
      const isValidName = /^[a-zA-Z0-9]{5,15}$/.test(text);

      if (!isValidName) {
        // Send error message and ask again
        await ctx.reply(
          "🌟 Selamat datang di proses pendaftaran Bulaksumur Menfess! 🌟\n\n" +
            "Silahkan balas dengan Nama Anonym Kamu.\n" +
            "Nama anonym hanya boleh huruf abjad & angka saja dengan panjang 5-15 karakter:",
          {
            reply_markup: { force_reply: true },
          }
        );
        return;
      }

      // Name is valid, proceed
      registration.data.name = text;
      registration.step = "email";

      await ctx.reply(
        `Terima kasih, ${text}! Sekarang masukkan alamat email Anda:`,
        {
          reply_markup: { force_reply: true },
        }
      );
    } else if (registration.step === "email") {
      // Process email input
      if (!isValidEmail(text)) {
        await ctx.reply(
          "Email tidak valid. Mohon masukkan alamat email yang valid:",
          {
            reply_markup: { force_reply: true },
          }
        );
        return;
      }

      registration.data.email = text;
      registration.step = "complete";

      // Complete registration
      await updateUserSession(userId, {
        status: SessionStatus.REGISTERED,
        registeredAt: new Date() as any,
      });

      // Remove from in-memory process map
      registrationProcesses.delete(userId);

      const keyboard = new InlineKeyboard().text(
        "Lihat Profil",
        "show_profile"
      );

      await ctx.reply(
        "🎉 Selamat! Pendaftaran Anda telah berhasil. 🎉\n\n" +
          `Nama: ${registration.data.name}\n` +
          `Email: ${registration.data.email}\n\n` +
          "Sekarang Anda dapat menggunakan semua fitur Bulaksumur Menfess Bot.",
        {
          reply_markup: keyboard,
        }
      );
    }
  });

  // Show profile callback
  bot.callbackQuery("show_profile", async (ctx) => {
    await ctx.answerCallbackQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    const session = await getUserSession(userId);

    if (!session || session.status !== SessionStatus.REGISTERED) {
      await ctx.reply(
        "Profil tidak ditemukan. Silakan daftar terlebih dahulu dengan /register"
      );
      return;
    }

    await ctx.reply(
      `📋 *Profil Pengguna*\n\n` +
        `ID: \`${session.userId}\`\n` +
        `Username: @${session.username || "tidak diatur"}\n` +
        `Status: Terdaftar ✅\n` +
        `Terdaftar pada: ${formatDateFromTimestamp(session.registeredAt)}\n`,
      {
        parse_mode: "Markdown",
      }
    );
  });

  // Add basic command handler
  bot.command(["start", "help", "rule"], async (ctx, next) => {
    // Always let commands pass through
    return next();
  });

  // This catches ALL regular messages from unregistered users
  // This must be the LAST handler to ensure it only catches unhandled messages
  bot.on(["message:text", "message:photo"], async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Skip if the user is in a registration process
    if (registrationProcesses.has(userId)) {
      return;
    }

    // Check if user is registered
    const isRegistered = await isUserRegistered(userId);
    console.log("hit", isRegistered);
    if (!isRegistered) {
      // Start registration process
      registrationProcesses.set(userId, {
        step: "name",
        data: {},
      });

      await createUserSession(
        userId,
        SessionStatus.REGISTRATION_IN_PROGRESS,
        ctx.from.username
      );

      await ctx.reply(
        "🌟 Selamat datang di proses pendaftaran Bulaksumur Menfess! 🌟\n\n" +
          "Silahkan balas dengan Nama Anonym Kamu.\n" +
          "Nama anonym hanya boleh huruf abjad & angka saja dengan panjang 5-15 karakter:",
        {
          reply_markup: { force_reply: true },
        }
      );
    }
  });
}
