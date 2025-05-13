import type { Timestamp } from "firebase-admin/firestore";
import type { SessionFlavor } from "grammy";
import type { Context } from "grammy";

export interface SessionData {
  isRegistered: boolean;
  anonName: string | null;
  userId: number | null;
  registeredAt: Date | null;
  emailRegistered: string | null;
  gender: "M" | "F" | null;
  birthMonth: number | null;
  birthYear: number | null;
  registerStep:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "email"
    | "confirmData"
    | "verifyEmail"
    | "complete";
  isBanned: boolean;
  premiumStatus: 1 | 2 | 3 | null;
  premiumUntil: Date | null;
  lastSendFeedback: Date | null;
  lastPostMenfess: Date | null;
  lastUserUpdatedDataWithDb: Date | null;
  lastSentInteract: Date | null;
}

export type BotContext = Context & SessionFlavor<SessionData>;

// Message handler state type
export type ListenMenfessState = {
  waitingForContent: boolean;
  messageToDelete?: number;
};

export type ListenFeedbackState = ListenMenfessState & {
  feedBackType: "kritik" | "saran" | "laporan";
};

export interface BotConfig {
  botToken: string;
  channelId: string;
  groupChatId: string;
  channelGroupChatIdNumber: number;
  groupChatIdNumber: number;
  postTrigger: string;
  firebase?: {
    projectId?: string;
    useEmulator?: boolean;
  };
  botUserName: string;
  telegramAdminId: number;
  adminBaseUserName: string;
  moderatorBaseUserName: string;
  botChatIdNumber: number;
}

export interface UserDbData {
  userId: number;
  username: string;
  emailRegistered: string;
  gender: "M" | "F";
  birthMonth: number;
  birthYear: number;
  registerStep:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "email"
    | "confirmData"
    | "verifyEmail"
    | "complete";
  isEmailVerified: boolean;
  registeredAt: Timestamp;
  anonName: string;
  menfessCount: number;
  premiumStatus: 1 | 2 | 3 | null;
  premiumUntil: Timestamp | null;
}

export interface MenfessDbData {
  channelChatId: number;
  groupChatId: number;
  createdAt: Timestamp;
  menfessUID: string;
  senderId: number;
  senderUserName: string;
  interactUsers: { userId: number; action: string }[];
  groupChatButtonId: number;
}

export interface MenfessReportDbData {
  reporterId: number;
  reporterUsername: string;
  menfessUID: string;
  menfessText: string;
  menfessSenderId: number;
  menfessSenderUsername: string;
  createdAt: Timestamp;
}
