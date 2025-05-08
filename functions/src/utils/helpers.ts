import { nanoid } from "nanoid";

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
export function generateUID(length: number = 12): string {
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

  if (match && match[1]) {
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
        errorMessage = errorStepMessage + " " + message;
      }
    }
  }
  return { isFail, errorMessage };
};
