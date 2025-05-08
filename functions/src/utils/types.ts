// Shared types for the application

import type { Timestamp } from "firebase-admin/firestore";

// Message handler state type
export type MenfessState = {
  waitingForContent: boolean;
  messageToDelete?: number;
};

// Config interface
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

// Firestore document types
export interface MenfessDbData {
  channelChatId: number;
  groupChatId: number;
  createdAt: Timestamp;
  menfessUID: string;
  senderId: number;
  senderUserName: string;
  interactUsers: number[];
}

export interface ReportDbData {
  reporterId: number;
  reporterUsername: string;
  menfessUID: string;
  menfessText: string;
  menfessSenderId: number;
  menfessSenderUsername: string;
  createdAt: Timestamp;
}

// MenfessPost type represents a menfess post to be saved in Firestore
export interface MenfessPost {
  text: string;
  userId: number;
  username?: string;
  messageId?: number;
  photoFileId?: string;
  timestamp?: Date | Timestamp;
  isApproved?: boolean;
}

// Interaction type for tracking user interactions with posts
export interface Interaction {
  userId: number;
  username?: string;
  postId: string;
  messageId: number;
  type: "like" | "dislike" | "report";
  timestamp?: Date | Timestamp;
}
