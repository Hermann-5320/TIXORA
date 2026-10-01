import { useEffect, useState } from "react";
import { http } from "../api/http";

// Configuration publique du backend (frais, commission, Google Client ID), chargée une seule fois.
const FALLBACK = { commissionPercent: 10, feePercent: 4.78, paymentMode: "live", googleClientId: "" };
let cache = null;

export default function useConfig() {
  const [config, setConfig] = useState(cache);
  useEffect(() => {
    if (cache) return;
    http.get("/config").then((c) => { cache = c; setConfig(c); }).catch(() => { cache = FALLBACK; setConfig(FALLBACK); });
  }, []);
  return config;
}

/** Estimation du montant payé : CT Pay ajoute ses frais au prix des billets (≈ 4,78 % constaté chez CT Pay ; valeur réelle confirmée par le serveur). */
export const totalWithFees = (subtotal, feePercent) => (subtotal <= 0 ? 0 : subtotal + Math.ceil((subtotal * Math.round(feePercent * 100)) / 10000));
