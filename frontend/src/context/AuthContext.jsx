import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { http, tokenStore } from "../api/http";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const homeFor = (role) => ({ ADMIN: "/admin", ORGANISATEUR: "/organisateur", CONTROLEUR: "/controle" }[role] || "/");

// Billets conservés sur l'appareil pour le mode hors ligne : effacés à la déconnexion (appareils partagés).
export const clearTicketCaches = () => {
  Object.keys(localStorage).filter((k) => k.startsWith("tx_tickets_")).forEach((k) => localStorage.removeItem(k));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    http.get("/auth/me").then(setUser).catch((e) => { if (!e.network) tokenStore.clear(); }).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user } = await http.post("/auth/login", credentials);
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  /** Connexion avec Google : `credential` est le jeton d'identité fourni par Google, vérifié côté serveur. */
  const googleLogin = useCallback(async (credential) => {
    const { token, user } = await http.post("/auth/google", { credential });
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const refreshUser = useCallback(() => http.get("/auth/me").then(setUser), []);

  const logout = useCallback(() => { tokenStore.clear(); clearTicketCaches(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, login, googleLogin, refreshUser, logout }), [user, loading, login, googleLogin, refreshUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
