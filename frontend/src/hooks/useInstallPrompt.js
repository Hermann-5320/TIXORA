import { useEffect, useState } from "react";

/** Capture l'invite d'installation PWA (Chrome/Edge/Android) pour l'afficher sur un bouton. */
export default function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const install = async () => { if (!prompt) return; prompt.prompt(); await prompt.userChoice; setPrompt(null); };
  return { canInstall: Boolean(prompt), install };
}
