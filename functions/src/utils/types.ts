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
  bio: string | null;
  faculty: string | null;
  univYear: number | null;
  agreement1: boolean | null;
  agreement2: boolean | null;
  agreement3: boolean | null;
  registerStep:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "bio"
    | "faculty"
    | "univYear"
    | "email"
    | "confirmData"
    | "agreement1"
    | "agreement2"
    | "agreement3"
    | "verifyEmail"
    | "complete";
  isBanned: boolean;
  premiumStatus: 1 | 2 | 3 | null;
  premiumUntil: Date | null;
  lastSendFeedback: Date | null;
  lastPostMenfess: Date | null;
  lastUserUpdatedDataWithDb: Date | null;
  lastSentInteract: Date | null;
  route: string;
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
  isBanned: boolean;
  userId: number;
  username: string;
  emailRegistered: string;
  gender: "M" | "F";
  birthMonth: number;
  birthYear: number;
  bio: string;
  faculty: string;
  univYear: number;
  agreement1: boolean;
  agreement2: boolean;
  agreement3: boolean;
  registerStep:
    | "anonName"
    | "birthMonth"
    | "birthYear"
    | "gender"
    | "bio"
    | "faculty"
    | "univYear"
    | "email"
    | "confirmData"
    | "agreement1"
    | "agreement2"
    | "agreement3"
    | "verifyEmail"
    | "complete";
  isEmailVerified: boolean;
  registeredAt: Timestamp;
  anonName: string;
  menfessCount: number;
  premiumStatus: 1 | 2 | 3 | null;
  premiumUntil: Timestamp | null;
  agreementSignAt: Timestamp | null;
  deletedCount: number | null;
  warnedCount: number | null;
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
