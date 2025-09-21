import type { BotConfig } from "./types";

const botConfigProd: BotConfig = {
  botToken: process.env.BOT_TOKEN_PROD || "",
  channelId: process.env.CHANNEL_ID_PROD || "",
  groupChatId: process.env.GROUP_CHAT_ID_PROD || "",
  postTrigger: process.env.POST_TRIGGER_PROD || "yujiem",
  channelGroupChatIdNumber: process.env.CHANNEL_GROUP_CHAT_ID_NUMBER_PROD
    ? Number(process.env.CHANNEL_GROUP_CHAT_ID_NUMBER_PROD)
    : 1,
  groupChatIdNumber: process.env.GROUP_CHAT_ID_NUMBER_PROD
    ? Number(process.env.GROUP_CHAT_ID_NUMBER_PROD)
    : 1,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "bulaksumur-fess",
  },
  botUserName: process.env.BOT_USER_NAME_PROD || "yujiemfessbot",
  telegramAdminId: process.env.TELEGRAM_ADMIN_ID_PROD
    ? Number(process.env.TELEGRAM_ADMIN_ID_PROD)
    : 1,
  adminBaseUserName: process.env.ADMIN_BASE_PROD || "edminfakultas",
  moderatorBaseUserName: process.env.MODERATOR_BASE_PROD || "edminfakultas",
  groupAccId: process.env.GROUP_ACC_ID_PROD
    ? Number(process.env.GROUP_ACC_ID_PROD)
    : 1,
  channelAccId: process.env.CHANNEL_ACC_ID
    ? Number(process.env.CHANNEL_ACC_ID_PROD)
    : 1,
  emailUser: process.env.EMAIL_USER_PROD || "",
  emailPass: process.env.EMAIL_PASS_PROD || "",
};

const botConfigPlayground: BotConfig = {
  botToken: process.env.BOT_TOKEN || "",
  channelId: process.env.CHANNEL_ID || "",
  groupChatId: process.env.GROUP_CHAT_ID || "",
  postTrigger: process.env.POST_TRIGGER || "menfess",
  channelGroupChatIdNumber: process.env.CHANNEL_GROUP_CHAT_ID_NUMBER
    ? Number(process.env.CHANNEL_GROUP_CHAT_ID_NUMBER)
    : 0,
  groupChatIdNumber: process.env.GROUP_CHAT_ID_NUMBER
    ? Number(process.env.GROUP_CHAT_ID_NUMBER)
    : 0,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "bulaksumur-fess",
  },
  botUserName: process.env.BOT_USER_NAME || "bulaksumurfessbot",
  telegramAdminId: process.env.TELEGRAM_ADMIN_ID
    ? Number(process.env.TELEGRAM_ADMIN_ID)
    : 0,
  adminBaseUserName: process.env.ADMIN_BASE || "crtyptockl",
  moderatorBaseUserName: process.env.MODERATOR_BASE || "crtyptockl",
  groupAccId: process.env.GROUP_ACC_ID ? Number(process.env.GROUP_ACC_ID) : 0,
  channelAccId: process.env.CHANNEL_ACC_ID
    ? Number(process.env.CHANNEL_ACC_ID)
    : 0,
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
};

// Load environment variables
export const botConfig: BotConfig =
  process.env.NODE_ENV === "production" ? botConfigProd : botConfigPlayground;

// Validate config
if (!botConfig.botToken) {
  throw new Error("BOT_TOKEN is not defined in environment variables");
}

if (!botConfig.channelId) {
  throw new Error("CHANNEL_ID is not defined in environment variables");
}

if (!botConfig.groupChatId) {
  throw new Error("GROUP_CHAT_ID is not defined in environment variables");
}

if (!botConfig.channelGroupChatIdNumber) {
  throw new Error(
    "CHANNEL_GROUP_CHAT_ID_NUMBER is not defined in environment variables"
  );
}

if (!botConfig.groupChatIdNumber) {
  throw new Error(
    "GROUP_CHAT_ID_NUMBER is not defined in environment variables"
  );
}
