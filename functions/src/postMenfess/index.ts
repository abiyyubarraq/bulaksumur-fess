import { FieldValue } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { postMenfessInteraction } from "../interactions";

import { footer, sendMainMenu } from "../mainBot/commands/commandMenuContent";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  containsTrigger,
  generateUID,
  getFooterMessage,
  getFormattedDate,
  isForwardedMenfessFromChannelToGroup,
  isValidMessage,
} from "../utils/helpers";
import { GoldRate, getMenfessMaxInteract } from "../utils/premium.helpers";
import {
  type BotContext,
  type ListenMenfessState,
  type MenfessDbData,
  MenfessHashtag,
} from "../utils/types";
import { settingMenuMessage } from "../viewMyProfile";

const userStates = new Map<number, ListenMenfessState>();

const waitingForMenfessMessage =
  `🔮 Balas dengan isi Menfess Kamu ✨\n\n` +
  `Menfess hanya bisa berupa text & photo yang terdapat keyword trigger ❝${botConfig.postTrigger}❞ 💥.\n\n` +
  `❕Menfess berupa text panjang minimal 32 karakter dan maksimal 888 karakter. Untuk Menfess dengan media panjang maksimal adalah 260 karakter. 😊\n\n` +
  `❕Hanya boleh karakter ASCII dengan maksimal 2 baris baru, diperbolehkan memakai format text telegram. ✨`;

const tosBaseMessage = (username: string): string => {
  return `Kamu @${username}\nDilarang keras mengirim Menfess:\n🚫 Tidak boleh melangar Peraturan & Ketentuan Base.\n🚫 Jual, Beli, Loker harus mengunakan Hashtag #SEL #BUY #LOKER.`;
};

const tosSentMenfess = (username: string): string => {
  return `${tosBaseMessage(username)}\n\nDengan mengirim pernyataan ini berarti Anda setuju dan bertanggung jawab atas Menfess anda?`;
};

const agreeTosMenfess = (username: string): string => {
  return `${tosBaseMessage(username)}\n\n<i><u>Anda sudah setuju dengan ketentuan di atas dan bertanggung jawab penuh atas Menfess yang akan dikirim.</u></i>`;
};

export function initPostHandlers(bot: Bot<BotContext>): void {
  bot.on(["message:text", "message:photo"], async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (isForwardedMenfessFromChannelToGroup(ctx)) {
      await postMenfessInteraction(ctx, bot);
      return;
    }

    const state = userStates.get(userId);
    if (state?.waitingForContent && ctx.session.route === "post_menfess") {
      try {
        if (state.messageToDelete) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
          } catch (error) {
            console.error("Failed to delete message:", error);
          }
        }

        const messageText = ctx.message.text || ctx.message.caption || "";

        if (
          !containsTrigger(messageText, botConfig.postTrigger) ||
          !isValidMessage(messageText, Boolean(ctx.message.caption) ? 25 : 32)
        ) {
          const keyboard = new InlineKeyboard().text(
            "« BACK",
            "back_to_start_post_menu"
          );
          const sentMessage = await ctx.reply(waitingForMenfessMessage, {
            reply_markup: keyboard,
          });

          ctx.session.route = "post_menfess";
          userStates.set(userId, {
            waitingForContent: true,
            waitingForTos: false,
            messageToDelete: sentMessage?.message_id,
          });
          return;
        }

        ctx.session.route = "idle";
        userStates.set(userId, {
          waitingForContent: false,
          waitingForTos: true,
          ctxToSend: ctx,
        });

        const tosKeyboard = new InlineKeyboard()
          .text("🚫 Nope", "send_menfess_tos_disagree")
          .text("🌟 Ya, Saya Setuju", "send_menfess_tos_agree")
          .row();

        await ctx.reply(tosSentMenfess(ctx.from?.username || ""), {
          reply_markup: tosKeyboard,
        });
      } catch (error) {
        console.error("Error posting message:", error);
        await ctx.reply(
          "Sorry, there was an error posting your message. Please try again later."
        );
      }
    } else {
      await next();
    }
  });

  const menfessTosDisagreeAction = async (ctx: BotContext) => {
    userStates.delete(ctx.from?.id || 0);
    await ctx.editMessageText("Menfess batal dikirim.");
    await sendMainMenu(ctx);
  };

  bot.callbackQuery("send_menfess_tos_disagree", async (ctx) => {
    await menfessTosDisagreeAction(ctx);
  });

  const menfessTosAgreeAction = async (ctx: BotContext) => {
    const agreeKeyboard = new InlineKeyboard()
      .text("⛔ Batalkan", "send_menfess_tos_disagree")
      .text("⏭️ Next", "send_menfess_tos_agree_next")
      .row();

    await ctx.editMessageText(agreeTosMenfess(ctx.from?.username || ""), {
      parse_mode: "HTML",
      reply_markup: agreeKeyboard,
    });
  };

  bot.callbackQuery("send_menfess_tos_agree", async (ctx) => {
    await menfessTosAgreeAction(ctx);
  });

  bot.callbackQuery("select_preference", async (ctx) => {
    await settingMenuMessage(ctx, "send_menfess_tos_agree_next");
  });

  const agreedTosNextAction = async (ctx: BotContext) => {
    if (!ctx.from?.id) return;
    const currentState = userStates.get(ctx.from.id);
    const keyboard = new InlineKeyboard()
      .text("Pilih Hashtag 🏷️", "select_hash_tag")
      .text("Preferensi ⚙️", "select_preference")
      .row()
      .text("« BACK", "send_menfess_tos_agree")
      .row()
      .text("📲 Kirim ke Telegram", "start_send_menfess_to_channel");

    const editedMessage = await ctx.editMessageText(
      "<b>Berikut adalah pengaturan menfessmu</b>\n" +
        (ctx.session.isShowDiamond
          ? `\n💎Tampilkan Diamond: ✅`
          : `\n💎Tampilkan Diamond: ❌`) +
        (ctx.session.isShowFaculty
          ? `\n🏫Tampilkan Fakultas: ✅`
          : `\n🏫Tampilkan Fakultas: ❌`) +
        (ctx.session.isShowAge
          ? `\n👤Tampilkan Umur: ✅`
          : `\n👤Tampilkan Umur: ❌`) +
        (ctx.session.isMenfessLocked
          ? `\n\nⓂ️Kunci Menfess: ✅`
          : `\n\nⓂ️Kunci Menfess: ❌`) +
        `\n\n<i>🔍 Hashtag yang digunakan: ${currentState?.hashTagUsed ? currentState?.hashTagUsed : "-"}</i>`,
      {
        reply_markup: keyboard,
        parse_mode: "HTML",
      }
    );

    userStates.set(ctx.from?.id || 0, {
      waitingForContent: true,
      waitingForTos: false,
      messageToDelete:
        typeof editedMessage === "object"
          ? editedMessage.message_id
          : undefined,
      ctxToSend: currentState?.ctxToSend,
      hashTagUsed: currentState?.hashTagUsed,
    });
  };

  bot.callbackQuery("send_menfess_tos_agree_next", async (ctx) => {
    await agreedTosNextAction(ctx);
  });

  bot.callbackQuery("select_hash_tag", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text(MenfessHashtag.SELL, `select_hashtag_${MenfessHashtag.SELL}`)
      .text(MenfessHashtag.BUY, `select_hashtag_${MenfessHashtag.BUY}`)
      .row()
      .text(MenfessHashtag.LOKER, `select_hashtag_${MenfessHashtag.LOKER}`)
      .text(MenfessHashtag.DATING, `select_hashtag_${MenfessHashtag.DATING}`)
      .row()
      .text(MenfessHashtag.DINNER, `select_hashtag_${MenfessHashtag.DINNER}`)
      .text(MenfessHashtag.JOGGING, `select_hashtag_${MenfessHashtag.JOGGING}`)
      .row()
      .text(MenfessHashtag.GYM, `select_hashtag_${MenfessHashtag.GYM}`)
      .text(MenfessHashtag.MOVIE, `select_hashtag_${MenfessHashtag.MOVIE}`)
      .row()
      .text(MenfessHashtag.PARTY, `select_hashtag_${MenfessHashtag.PARTY}`)
      .text(
        MenfessHashtag.SHOPPING,
        `select_hashtag_${MenfessHashtag.SHOPPING}`
      )
      .row()
      .text(MenfessHashtag.CONCERT, `select_hashtag_${MenfessHashtag.CONCERT}`)
      .text(MenfessHashtag.MUSIC, `select_hashtag_${MenfessHashtag.MUSIC}`)
      .row()
      .text(MenfessHashtag.STUDY, `select_hashtag_${MenfessHashtag.STUDY}`)
      .text(MenfessHashtag.WFC, `select_hashtag_${MenfessHashtag.WFC}`)
      .row()
      .text("« BACK", "send_menfess_tos_agree_next");

    await ctx.editMessageText("<b>#️⃣ Pilih hashtag untuk menfess kamu:</b>", {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  });

  bot.callbackQuery(/^select_hashtag_(.+)$/, async (ctx) => {
    const hashtag = ctx.callbackQuery.data.match(/^select_hashtag_(.+)$/)?.[1];
    if (!hashtag) return;
    const currentState = userStates.get(ctx.from.id);
    if (!currentState) return;

    userStates.set(ctx.from.id, {
      ...currentState,
      hashTagUsed: hashtag,
    });

    await agreedTosNextAction(ctx);
  });

  bot.callbackQuery("start_send_menfess_to_channel", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const state = userStates.get(userId);
    const menfessContext = state?.ctxToSend;
    if (!menfessContext) return;

    const messageText =
      menfessContext.message?.text || menfessContext.message?.caption;
    if (!messageText) return;

    userStates.delete(userId);

    if (state?.messageToDelete) {
      try {
        await ctx.api.deleteMessage(chatId, state.messageToDelete);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }

    const channelPostMessage = await postToChannel(
      menfessContext,
      state.hashTagUsed
    );

    const tosMessage = await ctx.reply(
      agreeTosMenfess(ctx.from?.username || ""),
      {
        parse_mode: "HTML",
      }
    );

    const keyboard = new InlineKeyboard()
      .text("❌ Unsent", `unsent_menfess_${channelPostMessage?.menfessUID}`)
      .url(
        "🔗 Menfess",
        `t.me/${botConfig.channelId.replace("@", "")}/${channelPostMessage?.sentMessage?.message_id}`
      );

    await ctx.reply(
      `🎊 Yeay! @${ctx.from?.username} Menfess kamu berhasil dikirim! 🎉\n\n` +
        `✨ *Menfess kamu:* ✨\n\n❝${messageText}❞\n\n` +
        `📅 Pada hari ${getFormattedDate()} 📅\n\n` +
        "🔗 Kamu bisa melihat menfess kamu di link dibawah ini ⬇️\n\n" +
        footer,
      {
        reply_markup: keyboard,
        reply_to_message_id: tosMessage?.message_id,
      }
    );
    ctx.session.lastPostMenfess = new Date();
    ctx.session.dailyGoldQuota -= GoldRate.SEND_MENFESS;
  });

  bot.callbackQuery(/^unsent_menfess_(.+)$/, async (ctx) => {
    const menfessIdMatch = ctx.callbackQuery.data.match(
      /^unsent_menfess_(.+)$/
    );
    if (!menfessIdMatch || !menfessIdMatch[1]) {
      await ctx.answerCallbackQuery({
        text: "Menfess ID not found",
        show_alert: true,
      });
      return;
    }

    const menfessId = menfessIdMatch[1];
    const menfessDbData = await db.collection("menfess").doc(menfessId).get();

    if (!menfessDbData.exists) {
      await ctx.answerCallbackQuery({
        text: "Menfess not found",
        show_alert: true,
      });
      return;
    }

    const menfessData = menfessDbData.data() as MenfessDbData;

    const menfessText =
      ctx.update?.callback_query?.message?.text?.match(
        /✨\n\n❝(.+?)❞\n\n/
      )?.[1];

    const sentDateStringFormatted =
      ctx.update?.callback_query?.message?.text?.match(
        /📅 Pada hari (.+?) 📅/
      )?.[1] || "";

    if (!sentDateStringFormatted) {
      await ctx.answerCallbackQuery({
        text: "Menfess tidak ditemukan",
        show_alert: true,
      });
      return;
    }

    const sentDate = moment(
      sentDateStringFormatted,
      "dddd, D MMMM YYYY [pukul] HH.mm",
      "id"
    );

    if (moment().isBefore(sentDate.clone().add(50, "seconds"))) {
      const secondsLeft = moment
        .duration(sentDate.clone().add(50, "seconds").diff(moment()))
        .asSeconds()
        .toFixed(0);

      await ctx.answerCallbackQuery({
        text: `Silahkan menunggu ${secondsLeft} detik lagi untuk menghapus menfess`,
        show_alert: true,
      });
      return;
    }

    if (moment().isAfter(sentDate.clone().add(60, "minutes"))) {
      await ctx.answerCallbackQuery({
        text: "Tidak bisa menghapus menfess, sudah melewati batas waktu penghapusan (1 jam)",
        show_alert: true,
      });
      return;
    }

    try {
      if (menfessData.groupChatButtonId) {
        await ctx.api.deleteMessage(
          botConfig.groupChatId,
          menfessData.groupChatButtonId
        );
      }

      if (menfessData.groupChatId) {
        await ctx.api.deleteMessage(
          botConfig.groupChatId,
          menfessData.groupChatId
        );
      }

      if (menfessData.channelChatId) {
        await ctx.api.deleteMessage(
          botConfig.channelId,
          menfessData.channelChatId
        );
      }

      await db.collection("menfess").doc(menfessId).delete();
      await ctx.editMessageText(
        `❝${menfessText || menfessId}❞\n\n<i><b>🚮 Menfess berhasil dihapus.</b></i>`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error(`Error deleting menfess: ${error}`);
      await ctx.answerCallbackQuery({
        text: "Gagal menghapus menfess. Coba lagi nanti.",
        show_alert: true,
      });
    }
  });
}

/**
 * Handle post command
 * @param ctx Bot context
 */
export async function startPostMenfessListener(ctx: BotContext): Promise<void> {
  if (ctx.session.dailyGoldQuota < GoldRate.SEND_MENFESS) {
    await ctx.editMessageText("...");
    await ctx.reply(
      "Gold kamu tidak mencukupi ☹️ Silakan upgrade ke premium member untuk mendapat gold lebih banyak 💸."
    );
    return;
  }

  if (
    ctx.session.lastPostMenfess &&
    moment(ctx.session.lastPostMenfess).isAfter(moment().subtract(1, "minutes"))
  ) {
    await ctx.deleteMessage();
    await ctx.reply("Kamu hanya bisa mengirim menfess sekali dalam 1 menit.");
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  const keyboard = new InlineKeyboard().text(
    "« BACK",
    "back_to_start_post_menu"
  );

  await ctx.editMessageText("....");
  const sentMessage = await ctx.reply(waitingForMenfessMessage, {
    reply_markup: keyboard,
  });

  ctx.session.route = "post_menfess";
  userStates.set(userId, {
    waitingForContent: true,
    messageToDelete:
      typeof sentMessage === "object" ? sentMessage.message_id : undefined,
    waitingForTos: false,
  });
}

/**
 * Post message to channel and return the sent message
 * @param ctx Bot context
 * @param hashTagUsed The hashtag used in the menfess
 * @returns The sent message object
 */
export async function postToChannel(ctx: BotContext, hashTagUsed?: string) {
  const userId = ctx.from?.id;
  if (!userId || !ctx.message) {
    return;
  }

  const userName = ctx.from?.username;
  const menfessUID = generateUID();
  const menfessFooter = `${getFooterMessage(ctx.session)} \n\n!$${menfessUID}`;

  try {
    let sentMessage;
    let messageText = "";

    if (ctx.message.photo && ctx.message.photo.length > 0) {
      const photoArray = ctx.message.photo;
      const lastPhoto = photoArray[photoArray.length - 1];

      if (!lastPhoto || !lastPhoto.file_id) {
        throw new Error("Invalid photo data");
      }

      messageText = ctx.message.caption || "";
      const caption = hashTagUsed
        ? `${hashTagUsed}\n\n${messageText}${menfessFooter}`
        : `${messageText}${menfessFooter}`;

      sentMessage = await ctx.api.sendPhoto(
        botConfig.channelId,
        lastPhoto.file_id,
        {
          caption: caption,
          parse_mode: "HTML",
        }
      );
    } else if (ctx.message.text) {
      messageText = ctx.message.text;
      const caption = hashTagUsed
        ? `${hashTagUsed}\n\n${messageText}${menfessFooter}`
        : `${messageText}${menfessFooter}`;

      sentMessage = await ctx.api.sendMessage(botConfig.channelId, caption, {
        parse_mode: "HTML",
      });
    } else {
      await ctx.api.sendMessage(
        userId,
        `Menfess hanya bisa berupa text & photo yang terdapat keyword trigger ❝${botConfig.postTrigger}❞ 😔.`
      );
    }

    console.log(
      `channelChatId:${sentMessage?.message_id} | senderId: ${userId} | senderUserName: ${userName} | Message posted to channel`
    );

    try {
      await db
        .collection("menfess")
        .doc(menfessUID)
        .set({
          channelChatId: sentMessage?.message_id,
          menfessUID: menfessUID,
          senderId: userId,
          senderUserName: userName?.toLowerCase() || "",
          createdAt: new Date(),
          interactUsers: [],
          senderAlias: ctx.session.anonName,
          freeInteractQuota: getMenfessMaxInteract(ctx.session.premiumStatus),
          isMenfessLocked: ctx.session.isMenfessLocked,
        });

      await db
        .collection("users")
        .doc(userId.toString())
        .update({
          menfessCount: FieldValue.increment(1),
        });

      console.log(
        `channelChatId:${sentMessage?.message_id} | senderId: ${userId} | senderUserName: ${userName} | Message stored in Firestore with ID: ${menfessUID}`
      );
    } catch (dbError) {
      console.error("Error saving to database:", dbError);
    }

    return { sentMessage, menfessUID };
  } catch (error) {
    console.error("Error sending message to channel:", error);
    throw error;
  }
}
