import { Bot } from "grammy";
import { initInteractionHandlers } from "../interactions";
import { initPostMenfessModule } from "../postMenfess";
import { botConfig } from "../utils/config";
import { initCommands } from "./commands";

/**
 * Create a new bot instance with all handlers
 * @returns The created bot instance
 */
export function createBot(): Bot {
  const bot = new Bot(botConfig.botToken);

  initCommands(bot);
  initPostMenfessModule(bot);
  initInteractionHandlers(bot);

  bot.catch((err) => {
    console.error("Bot error occurred:", err);
  });

  return bot;
}

/**
 * Start the bot
 * @param bot The bot instance to start
 */
export function startBot(bot: Bot): void {
  bot.start({
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });
}
