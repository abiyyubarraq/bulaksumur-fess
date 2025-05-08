import { Bot } from "grammy";
import { handlePostCommand, initPostHandlers, postToChannel } from "./handlers";

/**
 * Initialize the post menfess module
 * @param bot The Telegram bot instance
 * @param callback Optional callback function for when a message is posted
 */
export function initPostMenfessModule(
  bot: Bot,
  callback?: (sentMessage: any) => Promise<void>
): void {
  // Initialize the post handlers with optional callback
  initPostHandlers(bot, callback);
}

export { postToChannel, handlePostCommand };
