import { Bot, InlineKeyboard } from "grammy";
import { db } from "../utils/firebase";
import { getGenderEmoji } from "../utils/helpers";
import type { BotContext } from "../utils/types";

export const anonGuideText =
  "💡 Kirim /menu untuk memunculkan Menu Anonymous Chat.\n" +
  //   "💡 Reply pesanmu dengan /unsend untuk menghapus (hanya untuk pesan yg belum dibaca).\n" +
  "💡 Reveal Us 🤝🏻 dan Move to Inbox 📩 akan aktif di Menu Anonymous Chat dengan minimal bertukar 16 pesan.\n" +
  "💡 Pesan yang dikirim akan dihapus otomatis ketika « back atau lebih dari 6 jam.\n" +
  "💡 Pesan yang dikirim tidak bisa ditangkap layar atau diunduh oleh lawan.\n" +
  "💡 Kamu bisa mengirim pesan berupa text, photo, video, voice & location/live location.\n" +
  "💡 Kamu bisa mengirim text dengan format Bold, Italic, Underline, Strikethrough, Spoiler, & Monospace.\n" +
  "💡 Kamu bisa membalas sebuah pesan yang berasal dari lawanmu atau pesanmu sendiri.\n" +
  //   "💡 Kamu bisa pin/sematkan pesanmu, BOT akan menyematkan juga pesan tersebut di lawan bicaramu (pastikan pin/sematkan juga untuk BOT). Fitur pin/sematkan ini akan mengirim ulang pesan dan pin ulang pesan tersebut jika lawan bicaramu keluar masuk room chat, hanya bisa 1 pin/sematan, pin/sematkan pesan baru akan menggantikan yang lama.\n" +
  //   "💡 Reply pesanmu dengan /unpin untuk menghilangkan sematan.\n\n" +
  "‼️ Jangan pernah bertukar username selain lewat Reveal Us 🤝🏻, takut kamu kena tipu :(";
const chatObject: { [anonChatId: string]: number[] } = {};
export function initAnonChatHandlers(bot: Bot<BotContext>): void {
  bot.on("message:entities:bot_command", async (ctx, next) => {
    if (!ctx.session.route?.match(/^anonChat_[^_]+_\d+$/)) {
      return await next();
    }
    const receivedCmd = ctx.message.text?.split(" ")[0];
    if (receivedCmd && !["menu"].includes(receivedCmd.substring(1))) {
      await ctx.reply(
        "⚠️ Perintah tidak ditemukan. Gunakan /menu untuk melihat perintah terkait Anonymous Chat."
      );
      return;
    } else {
      return await next();
    }
  });

  bot.command("menu", async (ctx, next) => {
    if (!ctx.session.route?.match(/^anonChat_[^_]+_\d+$/)) {
      return await next();
    }

    const keyboard = new InlineKeyboard().text("🛑 End Chat", `end_chat`);
    await ctx.reply(anonGuideText, {
      reply_markup: keyboard,
    });
    return;
  });

  bot.callbackQuery(/^end_chat$/, async (ctx) => {
    if (!ctx.session.route?.match(/^anonChat_[^_]+_\d+$/)) {
      await ctx.editMessageText("....");
      await ctx.answerCallbackQuery();
      return;
    }
    const currentUserId = ctx.from?.id;
    const anonChatId = ctx.session.route?.split("_")[1];
    const otherUserId = ctx.session.route?.split("_")[2];
    if (!anonChatId || !otherUserId || !currentUserId) {
      await ctx.reply("❌ Error: Anonymous Chat ID not found");
      return;
    }
    await ctx.editMessageText("....");
    const isSixteen =
      (chatObject[anonChatId]?.filter((id) => id === parseInt(otherUserId))
        ?.length || 0) >= 8 &&
      (chatObject[anonChatId]?.filter((id) => id === currentUserId)?.length ||
        0) >= 8;

    const keyboard = new InlineKeyboard().text(
      "👻 Reveal Us 🤝🏻",
      `reveal_us_${anonChatId}_${otherUserId}`
    );
    const endChatText = `<i>👻 Anonymous Chat dengan id:</i> <code>${anonChatId}</code> <i>telah dihentikan ⏱️.</i>`;
    await ctx.reply(endChatText, {
      parse_mode: "HTML",
      ...(isSixteen && { reply_markup: keyboard }),
    });
    await ctx.api.sendMessage(parseInt(otherUserId), endChatText, {
      parse_mode: "HTML",
    });
    if (ctx.session.messageIdOnOtherUserSent.length > 0) {
      await bot.api.deleteMessages(
        parseInt(otherUserId),
        ctx.session.messageIdOnOtherUserSent
      );
    }
    if (ctx.session.myMessageIdOnOtherUserSent.length > 0) {
      await bot.api.deleteMessages(
        currentUserId,
        ctx.session.myMessageIdOnOtherUserSent
      );
    }
    ctx.session.messageIdOnOtherUserSent = [];
    ctx.session.route = "idle";
    ctx.session.startAnonChatAt = null;
    ctx.session.myMessageIdOnOtherUserSent = [];

    await db.collection("anonChats").doc(anonChatId).update({
      isEnded: true,
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^reveal_us_(.+)_(\d+)$/, async (ctx) => {
    const currentUserId = ctx.from?.id;
    const [, anonChatId, otherUserId] =
      ctx.callbackQuery.data.match(/^reveal_us_(.+)_(\d+)$/) || [];
    if (!anonChatId || !otherUserId || !currentUserId) {
      await ctx.reply("❌ Error: Anonymous Chat ID not found");
      return;
    }
    await ctx.editMessageText(
      `📫 Kamu meminta Reveal Us 🤝🏻 untuk anonymous chat dengan id: <code>${anonChatId}</code>`,
      {
        parse_mode: "HTML",
      }
    );
    const keyboard = new InlineKeyboard()
      .text("🤚 Tolak", `reject_reveal_us_${anonChatId}_${currentUserId}`)
      .text("😇 Terima", `accept_reveal_us_${anonChatId}`);
    await ctx.api.sendMessage(
      parseInt(otherUserId),
      `🦜 Seseorang dari anonymous chat dengan id: <code>${anonChatId}</code> ingin melakukan Reveal Us 🤝🏻, apakah kamu ingin menerimanya?`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery(/^accept_reveal_us_(.+)$/, async (ctx) => {
    const currentUserId = ctx.from?.id;
    const currentUsername = ctx.from?.username;
    const [, anonChatId] =
      ctx.callbackQuery.data.match(/^accept_reveal_us_(.+)$/) || [];

    if (!anonChatId || !currentUserId || !currentUsername) {
      await ctx.reply("❌ Error: Anonymous Chat ID not found");
      return;
    }

    await ctx.editMessageText(
      `🦜 Seseorang dari anonymous chat dengan id: <code>${anonChatId}</code> ingin melakukan Reveal Us 🤝🏻, apakah kamu ingin menerimanya?` +
        `\n\n<i><u>Kamu Menerima permintaan Reveal Us 🤝🏻 ini 😇.</u></i>`,
      {
        parse_mode: "HTML",
      }
    );

    const anonChatDoc = await db
      .collection("anonChats")
      .doc(anonChatId)
      .get()
      .then((doc) => doc.data());
    if (!anonChatDoc) {
      await ctx.reply("❌ Error: Anonymous Chat not found");
      return;
    }
    const anonChatData = anonChatDoc as {
      [key: string]: { isAgree: boolean; userName: string; gender: string };
    };

    const currentUser = anonChatData[currentUserId.toString()];
    const otherUserKey = Object.keys(anonChatData).find(
      (id) => id !== currentUserId.toString()
    );
    const otherUser = otherUserKey ? anonChatData[otherUserKey] : null;

    if (!currentUser || !otherUser || !otherUserKey) {
      await ctx.reply("❌ Error: User not found");
      return;
    }

    const currentKeyboard = new InlineKeyboard().url(
      "👤 Profile",
      `tg://user?id=${parseInt(otherUserKey)}`
    );
    await ctx.reply(
      `💌 Hai, Aku ${getGenderEmoji(otherUser.gender)} sebenarnya adalah @${otherUser.userName}` +
        `\n\nReveal Us 🤝🏻 untuk anonymous chat dengan id: <code>${anonChatId}</code>`,
      {
        reply_markup: currentKeyboard,
        parse_mode: "HTML",
      }
    );

    const otherKeyboard = new InlineKeyboard().url(
      "👤 Profile",
      `tg://user?id=${currentUserId}`
    );

    await ctx.api.sendMessage(
      parseInt(otherUserKey),
      `💌 Hai, Aku ${getGenderEmoji(ctx.session.gender)} sebenarnya adalah @${currentUsername}` +
        `\n\nReveal Us 🤝🏻 untuk anonymous chat dengan id: <code>${anonChatId}</code>`,
      {
        reply_markup: otherKeyboard,
        parse_mode: "HTML",
      }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^reject_reveal_us_(.+)_(\d+)$/, async (ctx) => {
    const [_, anonChatId, otherUserId] =
      ctx.callbackQuery.data.match(/^reject_reveal_us_(.+)_(\d+)$/) || [];
    if (!anonChatId || !otherUserId) {
      await ctx.reply("❌ Error: Anonymous Chat ID not found");
      return;
    }
    await ctx.editMessageText(
      `🦜 Seseorang dari anonymous chat dengan id: <code>${anonChatId}</code> ingin melakukan Reveal Us 🤝🏻, apakah kamu ingin menerimanya?` +
        `\n\n<i><u>Kamu Menolak permintaan Reveal Us 🤝🏻 ini 😔.</u></i>`,
      {
        parse_mode: "HTML",
      }
    );
    await ctx.api.sendMessage(
      parseInt(otherUserId),
      `Permintaan kamu untuk Reveal Us 🤝🏻 dari anonymous chat dengan id: <code>${anonChatId}</code> telah ditolak 😔`,
      {
        parse_mode: "HTML",
      }
    );
    await ctx.answerCallbackQuery();
  });

  bot.on("message", async (ctx, next) => {
    if (!ctx.session.route?.match(/^anonChat_[^_]+_\d+$/)) {
      return await next();
    }
    const [_, anonChatId, otherUserId] = ctx.session.route.split("_");
    if (!otherUserId || !anonChatId) return;

    const currentUserId = ctx.from?.id;

    if (!currentUserId) {
      await ctx.reply("❌ Error: User ID not found");
      return;
    }

    // Check if message type is allowed
    const allowedTypes = [
      "text",
      "photo",
      "video",
      "voice",
      "location",
      "venue",
    ];
    const messageType = ctx.message?.text
      ? "text"
      : ctx.message?.photo
        ? "photo"
        : ctx.message?.video
          ? "video"
          : ctx.message?.voice
            ? "voice"
            : ctx.message?.location
              ? "location"
              : ctx.message?.venue
                ? "venue"
                : null;

    if (!messageType || !allowedTypes.includes(messageType)) {
      await ctx.reply(
        "❌ Pesan tidak didukung. Hanya text, photo, video, voice & location/live location yang diperbolehkan."
      );
      return;
    }

    try {
      let messageIdOnOtherUser: number | null = null;

      if (
        chatObject[anonChatId]?.length &&
        chatObject[anonChatId]?.length >= 4 &&
        chatObject[anonChatId][chatObject[anonChatId].length - 1] ===
          currentUserId &&
        chatObject[anonChatId][chatObject[anonChatId].length - 2] ===
          currentUserId &&
        chatObject[anonChatId][chatObject[anonChatId].length - 3] ===
          currentUserId &&
        chatObject[anonChatId][chatObject[anonChatId].length - 4] ===
          currentUserId
      ) {
        ctx.session.myMessageIdOnOtherUserSent.push(ctx.message.message_id);
        const message = await ctx.reply(
          "Dilarang spam 🤚 tunggu lawan bicara kamu membalas dulu yaa 😌"
        );
        ctx.session.myMessageIdOnOtherUserSent.push(message.message_id);
        return;
      }
      if (messageType === "text") {
        const messageText = ctx.message?.text;
        if (!messageText) {
          await ctx.reply("❌ Error: Message content not found");
          return;
        }

        const message = await bot.api.sendMessage(
          parseInt(otherUserId),
          messageText,
          {
            parse_mode: "HTML",
          }
        );
        messageIdOnOtherUser = message.message_id;
      } else if (messageType === "photo") {
        const photo = ctx.message?.photo?.[0]; // Get the largest photo
        const caption = ctx.message?.caption;
        if (!photo) {
          await ctx.reply("❌ Error: Photo not found");
          return;
        }
        const message = await bot.api.sendPhoto(
          parseInt(otherUserId),
          photo.file_id,
          {
            caption: caption,
            parse_mode: "HTML",
          }
        );
        messageIdOnOtherUser = message.message_id;
      } else if (messageType === "video") {
        const video = ctx.message?.video;
        const caption = ctx.message?.caption;
        if (!video) {
          await ctx.reply("❌ Error: Video not found");
          return;
        }
        const message = await bot.api.sendVideo(
          parseInt(otherUserId),
          video.file_id,
          {
            caption: caption,
            parse_mode: "HTML",
          }
        );
        messageIdOnOtherUser = message.message_id;
      } else if (messageType === "voice") {
        const voice = ctx.message?.voice;
        if (!voice) {
          await ctx.reply("❌ Error: Voice not found");
          return;
        }
        const message = await bot.api.sendVoice(
          parseInt(otherUserId),
          voice.file_id
        );
        messageIdOnOtherUser = message.message_id;
      } else if (messageType === "location") {
        const location = ctx.message?.location;
        if (!location) {
          await ctx.reply("❌ Error: Location not found");
          return;
        }
        const message = await bot.api.sendLocation(
          parseInt(otherUserId),
          location.latitude,
          location.longitude
        );
        messageIdOnOtherUser = message.message_id;
      } else if (messageType === "venue") {
        const venue = ctx.message?.venue;
        if (!venue) {
          await ctx.reply("❌ Error: Venue not found");
          return;
        }
        const message = await bot.api.sendVenue(
          parseInt(otherUserId),
          venue.location.latitude,
          venue.location.longitude,
          venue.title,
          venue.address
        );
        messageIdOnOtherUser = message.message_id;
      }

      if (messageIdOnOtherUser) {
        ctx.session.messageIdOnOtherUserSent.push(messageIdOnOtherUser);
        if (!chatObject[anonChatId]) {
          chatObject[anonChatId] = [];
        }
        chatObject[anonChatId].push(currentUserId);
        if (chatObject[anonChatId].length > 40) {
          chatObject[anonChatId].shift();
        }
      }
      if (ctx.message?.message_id) {
        ctx.session.myMessageIdOnOtherUserSent.push(ctx.message.message_id);
      }
      if (
        ctx.session.myMessageIdOnOtherUserSent.length >= 8 &&
        ctx.session.myMessageIdOnOtherUserSent[0]
      ) {
        await ctx.api.deleteMessage(
          parseInt(ctx.from?.id.toString()),
          ctx.session.myMessageIdOnOtherUserSent[0]
        );
        ctx.session.myMessageIdOnOtherUserSent.shift();
      }
      if (
        ctx.session.messageIdOnOtherUserSent.length >= 8 &&
        ctx.session.messageIdOnOtherUserSent[0]
      ) {
        await bot.api.deleteMessage(
          currentUserId,
          ctx.session.messageIdOnOtherUserSent[0]
        );
        ctx.session.messageIdOnOtherUserSent.shift();
      }
    } catch (error) {
      console.error("Error sending anonymous message:", error);
      await ctx.reply(
        "❌ Failed to send message. The other user might have blocked the bot or left the chat."
      );
    }
  });
}
