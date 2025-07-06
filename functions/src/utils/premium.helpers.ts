/**
 * Get a premium badge based on the premium status
 * @param premiumStatus The premium status to get the badge for
 * @returns A string containing the premium badge
 */
export function getPremiumBadge(premiumStatus: number | null): string {
  if (premiumStatus === 1) return " 💎";
  if (premiumStatus === 2) return " 💎💎";
  if (premiumStatus === 3) return " 💎💎💎";
  return "";
}

export function getMenfessMaxInteract(premiumStatus: number | null): number {
  if (premiumStatus === 1) return 10;
  if (premiumStatus === 2) return 24;
  if (premiumStatus === 3) return 90;
  return 2;
}

export function getDailyGoldQuota(premiumStatus: number | null): number {
  if (premiumStatus === 1) return 1200;
  if (premiumStatus === 2) return 3300;
  if (premiumStatus === 3) return 7000;
  return 300;
}

export enum GoldRate {
  INTERACT = 105,
  ANON_REPLY = 65,
  SEND_MENFESS = 35,
  ANON_MESSAGE = 115,
}
