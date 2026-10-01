import { FiMoon, FiSun } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const dark = theme === "dark";
  return (
    <button onClick={toggle} aria-label={dark ? t("theme.toLight") : t("theme.toDark")} title={dark ? t("theme.toLight") : t("theme.toDark")}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white">
      {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  );
}
