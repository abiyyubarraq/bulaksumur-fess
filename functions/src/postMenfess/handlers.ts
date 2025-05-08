import { Bot, Context } from "grammy";
import { postMenfessInteraction } from "../interactions";
import { isForwardedMenfessFromChannelToGroup } from "../interactions";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  containsTrigger,
  generateUID,
  getFormattedDate,
} from "../utils/helpers";
import type { MenfessState } from "../utils/types";

// User states for handling menfess messages
const userStates = new Map<number, MenfessState>();

/**
 * Initialize post menfess handlers
 * @param bot The Telegram bot instance
 * @param callback Optional callback function for when a message is posted
 */
export function initPostHandlers(
  bot: Bot,
  callback?: (sentMessage: any) => Promise<void>
): void {
  // Post command handler (only use /post)
  bot.command("post", (ctx) => handlePostCommand(ctx));

  // Handle callback queries for post button
  bot.callbackQuery("post", (ctx) => handlePostCommand(ctx));

  // Cancel command to abort posting
  bot.command("cancel", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userStates.get(userId);
    if (state?.waitingForContent) {
      userStates.delete(userId);

      // Delete the waiting message if it exists
      if (state.messageToDelete) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, state.messageToDelete);
        } catch (error) {
          console.error("Failed to delete message:", error);
        }
      }

      await ctx.reply("Menfess posting cancelled.");
    } else {
      await ctx.reply("No active operation to cancel.");
    }
  });

  bot.on(["message:text", "message:photo"], async (ctx) => {
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
          await ctx.reply(
            `Your message must include the trigger word "${botConfig.postTrigger}" to be posted as a menfess.\n\n` +
              "Please try again with the trigger word in your message."
          );
          return;
        }

        // Post the message to the channel
        const sentMessage = await postToChannel(ctx);

        // Call the callback if provided
        if (callback && sentMessage) {
          console.log(
            "Executing callback for message ID:",
            sentMessage.message_id
          );
          try {
            await callback(sentMessage);
          } catch (callbackError) {
            console.error("Error in callback:", callbackError);
          }
        }

        // Confirm to the user
        await ctx.reply(
          "Your message has been posted anonymously! ✅\n" +
            "You can send another menfess by using /post."
        );
      } catch (error) {
        console.error("Error posting message:", error);
        await ctx.reply(
          "Sorry, there was an error posting your message. Please try again later."
        );
      }
    }
  });
}

/**
 * Handle post command
 * @param ctx Bot context
 */
export async function handlePostCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // If callback query, answer it
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  // Set user state to waiting for content
  const message = await ctx.reply(
    `Please send your message. It will be posted anonymously to the channel.\n\n` +
      `Your message MUST include the word "${botConfig.postTrigger}" to be posted.\n\n` +
      "You can send text, photos, or videos.\n\n" +
      "To cancel, send /cancel."
  );

  userStates.set(userId, {
    waitingForContent: true,
    messageToDelete: message.message_id,
  });
}

/**
 * Post message to channel and return the sent message
 * @param ctx Bot context
 * @returns The sent message object
 */
export async function postToChannel(ctx: Context) {
  if (!ctx.message) {
    throw new Error("No message to post");
  }

  const userId = ctx.from?.id;
  console.log("userId", userId);
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
        "Please send a text, photo, or video to post as a menfess."
      );
    }

    console.log(
      `Message posted to channel, channelChatId:${sentMessage?.message_id}, senderId: ${userId}, senderUserName: ${userName}`
    );

    try {
      await db.collection("menfess").doc(menfessUID).set({
        channelChatId: sentMessage?.message_id,
        menfessUID: menfessUID,
        senderId: userId,
        senderUserName: userName,
        createdAt: new Date(),
        interactUsers: [],
        //senderAlias: todo
      });

      console.log("Message stored in Firestore with ID:", menfessUID);
    } catch (dbError) {
      console.error("Error saving to database:", dbError);
    }

    return sentMessage;
  } catch (error) {
    console.error("Error sending message to channel:", error);
    throw error;
  }
}
