import { assetUrl } from "../api/http";

/** URL du logo d'un organisateur (null sans logo). */
export function logoUrl(user) {
  if (!user) return null;
  if (user.logo) return assetUrl(user.logo); // mode démo : data URL
  if (!user.hasLogo) return null;
  return assetUrl(`/organizers/${user.id}/logo?v=${Date.parse(user.logoUpdatedAt) || 0}`);
}
