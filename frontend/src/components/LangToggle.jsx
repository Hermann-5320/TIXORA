import { useTranslation } from "react-i18next";
import { FiGlobe } from "react-icons/fi";
import { setLang } from "../i18n";

export default function LangToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === "en" ? "fr" : "en";
  return (
    <button onClick={() => setLang(next)} aria-label={t("lang.switchTo")} title={t("lang.switchTo")}
      className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-white/85 transition hover:bg-white/10 hover:text-white">
      <FiGlobe size={16} />
      <span className={i18n.language === "fr" ? "text-white" : "text-white/50"}>FR</span>
      <span className="text-white/30">/</span>
      <span className={i18n.language === "en" ? "text-white" : "text-white/50"}>EN</span>
    </button>
  );
}
