import { apiThrottler } from "@grammyjs/transformer-throttler";
import { Bot, Context, session } from "grammy";
import { initBuyPremium } from "../buyPremium";
import { initInteractionHandlers } from "../interactions";
import { initPasteLinkHandler } from "../pasteLinkHandler";
import { initPostHandlers } from "../postMenfess";
import { initSessionModule } from "../registerSessions";
import { initSendFeedbackHandlers } from "../sendFeedback";
import { initTosMenu } from "../tosMenu";
import { botConfig } from "../utils/config";
import type { BotContext, SessionData } from "../utils/types";
import { initViewMyProfile } from "../viewMyProfile";
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
      isShowDiamond: true,
      isShowFaculty: true,
      isShowAge: true,
      age: null,
      dailyGoldQuota: 0, // adjust this to 300 (default value) on deployment
    };
  }
  function getSessionKey(ctx: Context): string | undefined {
    // Give every user their personal session storage
    // (will be shared across groups and in their private chat)
    return ctx.from?.id.toString();
  }
  bot.use(session({ initial, getSessionKey }));
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
  initViewMyProfile(bot);
  initBuyPremium(bot);
  bot.catch((err) => {
    console.error("Bot error occurred:", err);
  });

  return bot;
}
