import { apiThrottler } from "@grammyjs/transformer-throttler";
import { Bot, session } from "grammy";
import { initInteractionHandlers } from "../interactions";
import { initPasteLinkHandler } from "../pasteLinkHandler";
import { initPostHandlers } from "../postMenfess";
import { initSessionModule } from "../registerSessions";
import { initSendFeedbackHandlers } from "../sendFeedback";
import { initTosMenu } from "../tosMenu";
import { botConfig } from "../utils/config";
import type { BotContext, SessionData } from "../utils/types";
import { initViewUserProfile } from "../viewUserProfile";
import { initCommands } from "./commands/index";

export function startBot(bot: Bot<BotContext>): void {
  bot.start({
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });
}

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
      lastUserUpdatedDataWithDb: null,
      lastSentInteract: null,
      bio: null,
      faculty: null,
      univYear: null,
      agreement1: null,
      agreement2: null,
      agreement3: null,
      route: "idle",
    };
  }
  bot.use(session({ initial }));
  bot.api.config.use(apiThrottler());

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
  initTosMenu(bot);
  initCommands(bot);
  initPostHandlers(bot);
  initPasteLinkHandler(bot);
  initInteractionHandlers(bot);
  initSendFeedbackHandlers(bot);
  initViewUserProfile(bot);

  bot.catch((err) => {
    console.error("Bot error occurred:", err);
  });

  return bot;
}
