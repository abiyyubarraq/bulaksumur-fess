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
  // Create new bot
  const bot = new Bot(botConfig.botToken);

  // Initialize command handlers
  console.log("🔄 Initializing command handlers...");
  initCommands(bot);
  console.log("✅ Command handlers initialized");

  // Initialize post module
  console.log("🔄 Initializing post menfess module...");
  initPostMenfessModule(bot);
  console.log("✅ Post menfess module initialized");

  // Initialize interaction handlers
  console.log("🔄 Initializing interaction handlers...");
  initInteractionHandlers(bot);
  console.log("✅ Interaction handlers initialized");

  // Error handling
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
