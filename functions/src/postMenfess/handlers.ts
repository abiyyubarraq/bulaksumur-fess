import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { postMenfessInteraction } from "../interactions";
import { isForwardedMenfessFromChannelToGroup } from "../interactions";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  containsTrigger,
  generateUID,
  getFormattedDate,
} from "../utils/helpers";
import type { BotContext, MenfessState } from "../utils/types";

// User states for handling menfess messages
const userStates = new Map<number, MenfessState>();

const waitingForMenfessMessage =
  `Balas dengan isi Menfess Kamu\n\n` +
  `Menfess hanya bisa berupa text & photo yang terdapat keyword trigger ${botConfig.postTrigger}.\n\n` +
  `❕Menfess berupa text panjang minimal 32 karakter dan maksimal 888 karakter. Untuk Menfess dengan media panjang maksimal adalah 260 karakter.\n\n` +
  `❕Hanya boleh karakter ASCII dengan maksimal 2 baris baru, diperbolehkan memakai format text telegram.`;

/**
 * Initialize post menfess handlers
 * @param bot The Telegram bot instance
 */
export function initPostHandlers(bot: Bot<BotContext>): void {
  bot.on(["message:text", "message:photo"], async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (isForwardedMenfessFromChannelToGroup(ctx)) {
      await postMenfessInteraction(ctx, bot);
      return;
    }
    const state = userStates.get(userId);
    if (state?.waitingForContent) {
      userStates.delete(userId);

      try {
        // Delete the waiting message if it exists
        if (state.messageToDelete) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
          } catch (error) {
            console.error("Failed to delete message:", error);
          }
        }

        // Check for trigger word in the message
        let messageText = "";

        if (ctx.message.text) {
          messageText = ctx.message.text;
        } else if (ctx.message.caption) {
          messageText = ctx.message.caption;
        }

        // If the message doesn't contain the trigger word, reject it
        if (!containsTrigger(messageText, botConfig.postTrigger)) {
          const keyboard = new InlineKeyboard();
          keyboard.text("« BACK", "back_to_start_post_menu");
          const sentMessage = await ctx.reply(waitingForMenfessMessage, {
            reply_markup: keyboard,
          });
          userStates.set(userId, {
            waitingForContent: true,
            messageToDelete: sentMessage?.message_id,
          });
          return;
        }

        await postToChannel(ctx);

        // Confirm to the user
        await ctx.reply(
          "Your message has been posted anonymously! ✅\n" +
            "You can send another menfess by using /post."
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
    await ctx.reply(
      "You can only send menfess once per 5 minutes. Please try again later."
    );
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
  const formattedDate = getFormattedDate();
  const menfessUID = generateUID(20);
  const footer = `\n\n⏰ ${formattedDate} \n\n!$${menfessUID}`;

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

      const caption = `${messageText}${footer}`;

      sentMessage = await ctx.api.sendPhoto(
        botConfig.channelId,
        lastPhoto.file_id,
        {
          caption: caption,
        }
      );
    } else if (ctx.message.text) {
      messageText = ctx.message.text;

      const caption = `${messageText}${footer}`;

      sentMessage = await ctx.api.sendMessage(botConfig.channelId, caption);
    } else {
      await ctx.api.sendMessage(
        userId,
        "Please send a text, or photo to post as a menfess."
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

      console.log(
        `channelChatId:${sentMessage?.message_id} | senderId: ${userId} | senderUserName: ${userName} | Message stored in Firestore with ID: ${menfessUID}`
      );
    } catch (dbError) {
      console.error("Error saving to database:", dbError);
    }

    return sentMessage;
  } catch (error) {
    console.error("Error sending message to channel:", error);
    throw error;
  }
}
