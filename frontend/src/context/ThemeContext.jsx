import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches;
const stored = () => { try { return localStorage.getItem("tx_theme"); } catch { return null; } };

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => stored() || (systemDark() ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#090e1b" : "#0b1220");
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("tx_theme", next); } catch { /* ignoré */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
