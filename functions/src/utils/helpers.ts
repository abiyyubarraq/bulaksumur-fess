import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import { botConfig } from "./config";
import { getPremiumBadge } from "./premium.helpers";
import type { BotContext, SessionData } from "./types";

/**
 * Get a formatted date string for menfess posts
 * @returns A formatted date string
 */
export function getFormattedDate(): string {
  const now = new Date();
  const formattedDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formattedDate;
}

/**
 * Generate a unique ID for menfess posts
 * @param length Length of the unique ID (default: 12)
 * @returns A unique identifier string
 */
export function generateUID(length = 12): string {
  return nanoid(length);
}

/**
 * Extract menfess UID from a message containing !$UID
 * @param message The message text to extract UID from
 * @returns The extracted UID or null if not found
 */
export function extractMenfessUID(message: string | undefined): string | null {
  if (!message) return null;

  // Extract ID using regex - looking for !$ followed by characters at the end of the string or line
  const regex = /!\$([a-zA-Z0-9_-]+)(?:\s*$|\n|$)/;
  const match = message.match(regex);

  if (match?.[1]) {
    return match[1];
  }

  // Alternative approach - split by lines and check the last few lines for !$
  const lines = message.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (i < lines.length) {
      // Safety check for array bounds
      const line = lines[i];
      if (line && typeof line === "string") {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("!$")) {
          return trimmedLine.substring(2); // Remove the !$ prefix
        }
      }
    }
  }

  return null;
}

/**
 * Helper function to add a small delay between API calls
 * @param ms Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a message contains a trigger word
 * @param message The message to check
 * @param trigger The trigger word to check for
 * @returns True if the message contains the trigger word
 */
export function containsTrigger(message: string, trigger: string): boolean {
  if (!trigger) return true; // If no trigger defined, always return true

  return message.toLowerCase().includes(trigger.toLowerCase());
}

export const retryWrapper = async (
  attemptNumber: number,
  errorStepMessage: string,
  mainFn: () => Promise<void>,
  onErrorFn?: (e: unknown) => Promise<void>
) => {
  let isFail = false;
  let errorMessage = "";
  for (let i = 1; i <= attemptNumber; i++) {
    try {
      await mainFn();
      break;
    } catch (error) {
      let message = "";
      if (typeof error === "string") message = error;
      else if (error instanceof Error) message = error.message;

      if (i < attemptNumber) {
        console.log(`Error: ${message}. Attempt ${i}. Retrying...`);
        if (onErrorFn) await onErrorFn(error);
      } else {
        console.log(`Reached maximum attempt for ${errorStepMessage}.`);
        isFail = true;
        errorMessage = `${errorStepMessage} ${message}`;
      }
    }
  }
  return { isFail, errorMessage };
};

/**
 * Format a Firestore timestamp for display
 * @param timestamp The timestamp to format
 * @returns Formatted date string or "N/A" if timestamp is undefined
 */
export function formatDateFromTimestamp(timestamp?: any): string {
  if (!timestamp) return "N/A";

  if (timestamp.toDate) {
    const date = timestamp.toDate();
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return "N/A";
}

/**
 * Validate email format
 * @param email The email string to validate
 * @returns Boolean indicating if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@mail\.ugm\.ac\.id$/;
  return emailRegex.test(email);
}

/**
 * Validate name format
 * @param name The name string to validate
 * @returns Boolean indicating if name format is valid
 */
export function isValidName(name: string): boolean {
  const nameRegex = /^[a-zA-Z0-9]{5,15}$/;
  return nameRegex.test(name);
}

/**
 * Type-safe utility function to match callback data
 */
export function matchCallbackData(
  pattern: RegExp,
  data: string | undefined
): RegExpMatchArray | null {
  if (typeof data !== "string") return null;
  return data.match(pattern);
}

/**
 * Check if a message meets safety and length requirements
 * @param message The message to validate
 * @returns Boolean indicating if message is valid
 */
export function isValidMessage(
  message: string,
  minimalStringLength = 32,
  maximalStringLength = 888
): boolean {
  // Check minimum length of 32 characters
  if (message.length < minimalStringLength) {
    return false;
  }

  if (message.length > maximalStringLength) {
    return false;
  }

  if (!checkValidMessage(message)) {
    return false;
  }

  return true;
}

export function sliceMenfessText(message: string): string {
  if (!message) return "";

  // Find the position of gender emojis (🕺 or 💃)
  const maleEmojiIndex = message.indexOf("🕺");
  const femaleEmojiIndex = message.indexOf("💃");

  // Determine where to cut the text
  let cutIndex = -1;
  if (maleEmojiIndex !== -1 && femaleEmojiIndex !== -1) {
    cutIndex = Math.min(maleEmojiIndex, femaleEmojiIndex);
  } else if (maleEmojiIndex !== -1) {
    cutIndex = maleEmojiIndex;
  } else if (femaleEmojiIndex !== -1) {
    cutIndex = femaleEmojiIndex;
  }

  // If emoji is found, trim the message
  let trimmedMessage = message;
  if (cutIndex !== -1) {
    trimmedMessage = message.substring(0, cutIndex).trim();
  }

  // Limit the main content to maximum 70 characters
  if (trimmedMessage.length > 70) {
    trimmedMessage = `${trimmedMessage.substring(0, 70).trim()}...`;
  }

  return trimmedMessage;
}

export function checkValidMessage(message: string): boolean {
  // Check for ASCII characters only
  const asciiRegex = /^[\x20-\x7E\n]+$/;
  if (!asciiRegex.test(message)) {
    return false;
  }

  // Check for URLs
  const channelLinkRegex = new RegExp(
    `https://t\\.me/${botConfig.channelId.replace("@", "")}/\\d+$`
  );
  const groupLinkRegex = new RegExp(
    `https://t\\.me/${botConfig.groupChatId.replace("@", "")}/\\d+$`
  );
  const channelCommentLinkRegex = new RegExp(
    `https://t\\.me/${botConfig.channelId.replace("@", "")}/(\\d+)(\\?comment=(\\d+))?$`
  );

  if (message.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi)) {
    // If it contains URLs, only allow specific telegram links
    return (
      channelLinkRegex.test(message) ||
      groupLinkRegex.test(message) ||
      channelCommentLinkRegex.test(message)
    );
  }

  // Check for username mentions (@username)
  const usernameRegex = /@\w+/g;
  if (usernameRegex.test(message)) {
    return false;
  }

  return true;
}

/**
 * Sanitize a message by removing non-alphanumeric characters and trimming whitespace
 * @param message The message to sanitize
 * @returns A sanitized message
 */
export function sanitizeMessage(message: string): string {
  // Remove excessive whitespace and newlines
  const trimmed = message.replace(/\s+/g, " ").trim();

  // Remove any control characters
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  return sanitized;
}

export function isForwardedMenfessFromChannelToGroup(ctx: BotContext): boolean {
  return Boolean(
    ctx.senderChat?.id === botConfig.channelGroupChatIdNumber &&
      ctx.chat?.id === botConfig.groupChatIdNumber &&
      ctx.message?.message_id &&
      extractMenfessUID(ctx.message.text)
  );
}

export function isChatFromUserToGroup(ctx: BotContext): boolean {
  return Boolean(
    ctx.update?.message?.chat?.id &&
      ctx.update?.message?.chat?.id === Number(botConfig.groupChatIdNumber)
  );
}

export function getGenderEmoji(gender: string | null): string {
  if (!gender) return "";
  return gender === "M" ? "🕺#M" : "💃#F";
}

export function getFooterMessage(session: SessionData): string {
  return (
    "\n\n" +
    getAgeAndGender(session) +
    `${session.isShowDiamond ? getPremiumBadge(session.premiumStatus) : ""}` +
    `${session.isShowFaculty ? "\n" + "🏫 " + session.faculty : ""}`
  );
}

export function getAge(session: SessionData): string {
  if (!session.age) return "-";
  return session.isShowAge
    ? session.age.toString()
    : session.age <= 25
      ? "✘✘"
      : "⁕⁕";
}

export function getAgeAndGender(session: SessionData): string {
  return getGenderEmoji(session.gender) + getAge(session);
}

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: botConfig.emailUser,
    pass: botConfig.emailPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
// await transporter.sendMail({
//   from: `"Your Bot"`,
//   to: "abiyyu.b@gmail.com",
//   subject: "Your Verification Code For ",
//   text: "Your verification code is: cuki",
//   html: "<p>Your verification code is: <b>cuki</b></p>",
// });
