import { Bot, session } from "grammy";
import { initInteractionHandlers } from "../interactions";
import { initPostHandlers } from "../postMenfess";
import { initSessionModule } from "../registerSessions";
import { initSendFeedbackHandlers } from "../sendFeedback";
import { botConfig } from "../utils/config";
import type { BotContext, SessionData } from "../utils/types";
import { initCommands } from "./commands";

/**
 * Create a new bot instance with all handlers
 * @returns The created bot instance
 */
export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(botConfig.botToken);
  function initial(): SessionData {
    return {
      isRegistered: false,
      anonName: null,
      userId: null,
      registeredAt: null,
      emailRegistered: null,
      gender: null,
      registerStep: "anonName",
      birthMonth: null,
      birthYear: null,
      isBanned: false,
      premiumStatus: null,
      premiumUntil: null,
      lastSendFeedback: null,
      lastPostMenfess: null,
    };
  }
  bot.use(session({ initial }));

  bot.api.setMyCommands([
    {
      command: "/menu",
      description: "Menu Bot",
    },
    {
      command: "/help",
      description: "Bantuan Penggunaan Bot",
    },
    {
      command: "/rules",
      description: "Peraturan Base",
    },
  ]);

  initSessionModule(bot);
  initCommands(bot);
  initPostHandlers(bot);
  initInteractionHandlers(bot);
  initSendFeedbackHandlers(bot);

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
