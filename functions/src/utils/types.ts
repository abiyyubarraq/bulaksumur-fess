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
}

export type BotContext = Context & SessionFlavor<SessionData>;

// Message handler state type
export type MenfessState = {
  waitingForContent: boolean;
  messageToDelete?: number;
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
}

// User session and registration status
export enum SessionStatus {
  NOT_REGISTERED = "not_registered",
  REGISTERED = "registered",
  REGISTRATION_IN_PROGRESS = "registration_in_progress",
}

export interface UserSession {
  userId: number;
  username?: string;
  status: SessionStatus;
  registeredAt?: Timestamp;
  lastActivity: Timestamp;
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
  interactUsers: { userId: number; interactAction: string }[];
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

// // MenfessPost type represents a menfess post to be saved in Firestore
// export interface MenfessPost {
//   text: string;
//   userId: number;
//   username?: string;
//   messageId?: number;
//   photoFileId?: string;
//   timestamp?: Date | Timestamp;
//   isApproved?: boolean;
// }

// // Interaction type for tracking user interactions with posts
// export interface Interaction {
//   userId: number;
//   username?: string;
//   postId: string;
//   messageId: number;
//   type: "like" | "dislike" | "report";
//   timestamp?: Date | Timestamp;
// }
