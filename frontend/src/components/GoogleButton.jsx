import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FcGoogle } from "react-icons/fc";
import useConfig from "../hooks/useConfig";
import { MOCK } from "../api/http";
import { useAuth } from "../context/AuthContext";

let scriptPromise = null;
const loadGsi = () => {
  scriptPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { scriptPromise = null; reject(new Error("gsi")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
};

/**
 * « Se connecter avec Google » pour les clients. Le jeton d'identité est envoyé au backend qui le vérifie.
 * Affiché seulement si le backend a un GOOGLE_CLIENT_ID ; en mode démo (mock), un bouton simule la connexion.
 */
export default function GoogleButton({ onDone, onError, signup = false }) {
  const config = useConfig();
  const { googleLogin } = useAuth();
  const { t, i18n } = useTranslation();
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);
  const clientId = config?.googleClientId;
  const real = Boolean(clientId) && !MOCK;

  useEffect(() => {
    if (!real) return undefined;
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res) => {
          try { onDone(await googleLogin(res.credential)); } catch (e) { onError?.(e.message); }
        },
      });
      holder.current.innerHTML = "";
      window.google.accounts.id.renderButton(holder.current, {
        type: "standard", theme: "outline", size: "large", shape: "pill", logo_alignment: "left", locale: i18n.language,
        text: signup ? "signup_with" : "signin_with", width: Math.min(360, holder.current.clientWidth || 320),
      });
    }).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [real, clientId, i18n.language, signup, googleLogin, onDone, onError]);

  if (!clientId || failed) return null;

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-line" />{t("auth.or")}<span className="h-px flex-1 bg-line" /></div>
      {real ? <div ref={holder} className="flex min-h-[44px] justify-center" /> : (
        <button type="button" className="btn-outline w-full !rounded-full"
          onClick={async () => { try { onDone(await googleLogin("demo.google@tixora.demo")); } catch (e) { onError?.(e.message); } }}>
          <FcGoogle size={20} />{signup ? t("auth.googleSignup") : t("auth.googleLogin")}
        </button>
      )}
      <p className="mt-2 text-center text-xs text-muted">{t("auth.googleClientsOnly")}</p>
    </div>
  );
}
