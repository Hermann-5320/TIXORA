const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
export const isHex = (c) => /^#[0-9a-fA-F]{6}$/.test(c || "");

function rgb(hex) {
  const h = isHex(hex) ? hex : "#f24e12";
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;

/** Assombrit (amount < 0) ou éclaircit (amount > 0) une couleur, de -1 à 1. */
export function shade(hex, amount) {
  return toHex(rgb(hex).map((v) => (amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
}

/** Couleur de texte lisible (blanc ou presque noir) sur un fond donné. */
export function readableOn(hex) {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#0f172a" : "#ffffff";
}
export const rgbOf = rgb;
