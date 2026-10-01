import { BASE, MOCK } from "../api/http";

/**
 * Lien à partager. Avec le vrai backend, on partage la page d'aperçu (/api/share/events/{id}) qui expose les balises
 * Open Graph (image + titre dans WhatsApp, Facebook, X) puis redirige vers l'événement.
 */
export function shareUrl(event) {
  if (MOCK) return `${window.location.origin}/evenements/${event.id}`;
  const base = /^https?:/.test(BASE) ? BASE : `${window.location.origin}${BASE}`;
  return `${base}/share/events/${event.id}`;
}
