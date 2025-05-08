import type { BotConfig } from "./types";

// Load environment variables
export const botConfig: BotConfig = {
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
    useEmulator: process.env.FIREBASE_USE_EMULATOR === "true",
  },
};

// Normalize channel and group IDs (ensure they don't have @ for API calls)
if (botConfig.channelId.startsWith("@")) {
  console.log("Normalized channelId from @ format for API calls");
}

if (botConfig.groupChatId.startsWith("@")) {
  console.log("Normalized groupChatId from @ format for API calls");
}

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
