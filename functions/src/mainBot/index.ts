import { Bot, session } from "grammy";
import { initInteractionHandlers } from "../interactions";
import { initPostHandlers } from "../postMenfess";

import { type ParseModeFlavor, hydrateReply } from "@grammyjs/parse-mode";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { initPasteLinkHandler } from "../pasteLinkHandler";
import { initSessionModule } from "../registerSessions";
import { initSendFeedbackHandlers } from "../sendFeedback";
import { botConfig } from "../utils/config";
import type { BotContext, SessionData } from "../utils/types";
import { initViewUserProfile } from "../view-user-profile";
import { initCommands } from "./commands/index";

export function startBot(bot: Bot<ParseModeFlavor<BotContext>>): void {
  bot.start({
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });
}

export function createBot(): Bot<ParseModeFlavor<BotContext>> {
  const bot = new Bot<ParseModeFlavor<BotContext>>(botConfig.botToken);
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
      route: "idle_not_registered",
    };
  }
  bot.use(session({ initial }));
  bot.use(hydrateReply);
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
