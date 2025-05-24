import { FieldValue } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { postMenfessInteraction } from "../interactions";

import { footer } from "../mainBot/commands/commandMenuContent";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  containsTrigger,
  generateUID,
  getFormattedDate,
  isForwardedMenfessFromChannelToGroup,
  isValidMessage,
} from "../utils/helpers";
import type {
  BotContext,
  ListenMenfessState,
  MenfessDbData,
} from "../utils/types";

const userStates = new Map<number, ListenMenfessState>();

const waitingForMenfessMessage =
  `🔮 Balas dengan isi Menfess Kamu ✨\n\n` +
  `Menfess hanya bisa berupa text & photo yang terdapat keyword trigger ${botConfig.postTrigger} 👍.\n\n` +
  `❕Menfess berupa text panjang minimal 32 karakter dan maksimal 888 karakter. Untuk Menfess dengan media panjang maksimal adalah 260 karakter. 😊\n\n` +
  `❕Hanya boleh karakter ASCII dengan maksimal 2 baris baru, diperbolehkan memakai format text telegram. ✨`;

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
      ctx.session.route = "idle";
      userStates.delete(userId);

      try {
        if (state.messageToDelete) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
          } catch (error) {
            console.error("Failed to delete message:", error);
          }
        }

        let messageText = "";

        if (ctx.message.text) {
          messageText = ctx.message.text;
        } else if (ctx.message.caption) {
          messageText = ctx.message.caption;
        }

        if (
          !containsTrigger(messageText, botConfig.postTrigger) &&
          !isValidMessage(messageText)
        ) {
          const keyboard = new InlineKeyboard();
          keyboard.text("« BACK", "back_to_start_post_menu");
          const sentMessage = await ctx.reply(waitingForMenfessMessage, {
            reply_markup: keyboard,
          });
          ctx.session.route = "post_menfess";
          userStates.set(userId, {
            waitingForContent: true,
            messageToDelete: sentMessage?.message_id,
          });
          return;
        }

        const channelPostMessage = await postToChannel(ctx);

        const keyboard = new InlineKeyboard();
        keyboard
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
          }
        );
        ctx.session.lastPostMenfess = new Date();
      } catch (error) {
        console.error("Error posting message:", error);
        await ctx.reply(
          "Sorry, there was an error posting your message. Please try again later."
        );
      }
    } else {
      await next();
      return;
    }
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

    if (moment().isBefore(sentDate.clone().add(30, "seconds"))) {
      const secondsLeft = moment
        .duration(sentDate.clone().add(30, "seconds").diff(moment()))
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
        `✅ Sukses menghapus menfess:\n\n ❝${menfessText || menfessId}❞`,
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
  if (
    ctx.session.lastPostMenfess &&
    moment(ctx.session.lastPostMenfess).isAfter(moment().subtract(5, "minutes"))
  ) {
    await ctx.deleteMessage();
    await ctx.reply("Kamu hanya bisa mengirim menfess sekali dalam 5 menit.");
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  // If callback query, answer it
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
  const keyboard = new InlineKeyboard();
  keyboard.text("« BACK", "back_to_start_post_menu");
  // Set user state to waiting for content
  const sentMessage = (await ctx.editMessageText(waitingForMenfessMessage, {
    reply_markup: keyboard,
  })) as { message_id: number };
  ctx.session.route = "post_menfess";
  userStates.set(userId, {
    waitingForContent: true,
    messageToDelete: sentMessage?.message_id,
  });
}

/**
 * Post message to channel and return the sent message
 * @param ctx Bot context
 * @returns The sent message object
 */
export async function postToChannel(ctx: BotContext) {
  if (!ctx.message) {
    throw new Error("No message to post");
  }

  const userId = ctx.from?.id;

  if (!userId) {
    throw new Error("User ID not found");
  }

  const userName = ctx.from?.username;
  const menfessUID = generateUID(20);
  const menfessFooter = `\n\n${ctx.session.gender === "M" ? "🕺 #M✘✘" : "💃 #F✘✘"} \n\n!$${menfessUID}`;

  try {
    let sentMessage;
    let messageText = "";
    let mediaType = "";
    let mediaId = "";

    if (ctx.message.photo && ctx.message.photo.length > 0) {
      // For photos - get the highest resolution photo (last in the array)
      const photoArray = ctx.message.photo;
      // Type assertion to ensure the object exists
      const lastPhoto = photoArray[photoArray.length - 1];
      if (!lastPhoto || !lastPhoto.file_id) {
        throw new Error("Invalid photo data");
      }

      mediaType = "photo";
      mediaId = lastPhoto.file_id;
      messageText = ctx.message.caption || "";

      const caption = `${messageText}${menfessFooter}`;

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

      const caption = `${messageText}${menfessFooter}`;

      sentMessage = await ctx.api.sendMessage(botConfig.channelId, caption, {
        parse_mode: "HTML",
      });
    } else {
      await ctx.api.sendMessage(
        userId,
        `Menfess hanya bisa berupa text & photo yang terdapat keyword trigger ${botConfig.postTrigger} 😔.`
      );
    }

    console.log(
      `channelChatId:${sentMessage?.message_id} | senderId: ${userId} | senderUserName: ${userName} | Message posted to channel`
    );

    try {
      await db.collection("menfess").doc(menfessUID).set({
        channelChatId: sentMessage?.message_id,
        menfessUID: menfessUID,
        senderId: userId,
        senderUserName: userName,
        createdAt: new Date(),
        interactUsers: [],
        senderAlias: ctx.session.anonName,
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
