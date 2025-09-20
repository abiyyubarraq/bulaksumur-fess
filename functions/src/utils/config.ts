import type { BotConfig } from "./types";

// Load environment variables
export const botConfig: BotConfig = {
  botToken: process.env.BOT_TOKEN || "",
  channelId: process.env.CHANNEL_ID || "",
  groupChatId: process.env.GROUP_CHAT_ID || "",
  postTrigger: process.env.POST_TRIGGER || "menfess",
  botChatIdNumber: process.env.BOT_CHAT_ID_NUMBER
    ? Number(process.env.BOT_CHAT_ID_NUMBER)
    : 0,
  channelGroupChatIdNumber: process.env.CHANNEL_GROUP_CHAT_ID_NUMBER
    ? Number(process.env.CHANNEL_GROUP_CHAT_ID_NUMBER)
    : 0,
  groupChatIdNumber: process.env.GROUP_CHAT_ID_NUMBER
    ? Number(process.env.GROUP_CHAT_ID_NUMBER)
    : 0,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "bulaksumur-fess",
    useEmulator: process.env.FIREBASE_USE_EMULATOR === "true",
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
    "CHANNEL_GROUP_CHAT_ID_NUMBER is not defined in environment variables",
  );
}

if (!botConfig.groupChatIdNumber) {
  throw new Error(
    "GROUP_CHAT_ID_NUMBER is not defined in environment variables",
  );
}
