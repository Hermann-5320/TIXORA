import i18n from "../i18n";

const locale = () => (i18n.language === "en" ? "en-GB" : "fr-FR");

export const fmtDate = (d) => new Date(d).toLocaleString(locale(), { dateStyle: "long", timeStyle: "short" });
export const fmtDay = (d) => new Date(d).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtTime = (d) => new Date(d).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
export const fmtShort = (d) => new Date(d).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
export const fmtPrice = (n) => `${Number(n).toLocaleString(locale())} FCFA`;

/** Jour et mois abrégés pour le badge de date d'une carte. */
export function dateBadge(d) {
  const date = new Date(d);
  return {
    day: date.toLocaleDateString(locale(), { day: "numeric" }),
    month: date.toLocaleDateString(locale(), { month: "short" }).replace(".", ""),
  };
}

/** Prix minimum d'un événement (0 = gratuit). */
export const minPrice = (ev) => (ev.ticketTypes?.length ? Math.min(...ev.ticketTypes.map((t) => t.price)) : 0);
export const seatsLeft = (ev) => (ev.ticketTypes || []).reduce((s, t) => s + t.capacity - t.sold, 0);

/** Valeur `datetime-local` (heure locale, sans fuseau) à partir d'une date ISO du serveur. */
export const toInputDate = (iso) => (iso ? iso.slice(0, 16) : "");
