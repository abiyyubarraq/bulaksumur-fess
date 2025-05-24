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
  if (premiumStatus === 2) return 23;
  if (premiumStatus === 3) return 90;
  return 2;
}
