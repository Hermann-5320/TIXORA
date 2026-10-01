import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr";
import en from "./en";

export const LANGS = ["fr", "en"];

function initialLang() {
  try {
    const saved = localStorage.getItem("tx_lang");
    if (LANGS.includes(saved)) return saved;
  } catch { /* stockage indisponible */ }
  return (navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export function setLang(lang) {
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  try { localStorage.setItem("tx_lang", lang); } catch { /* ignoré */ }
}

export default i18n;
