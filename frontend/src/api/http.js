import { mockRequest, mockUpload } from "./mock";
import i18n from "../i18n";

export const BASE = import.meta.env.VITE_API_URL || "/api";
// Sans variable definie : mock en developpement, api en production.
export const MODE = import.meta.env.VITE_API_MODE || (import.meta.env.DEV ? "mock" : "api");
export const MOCK = MODE === "mock";
const TOKEN_KEY = "tx_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** URL complète d'une ressource renvoyée par l'API (ex. la photo d'un événement). */
export const assetUrl = (path) => (!path ? null : /^(data:|https?:)/.test(path) ? path : `${BASE}${path}`);

async function request(method, path, body, form) {
  const token = tokenStore.get();
  if (MOCK) return form ? mockUpload(path, form, token) : mockRequest(method, path, body, token);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Accept-Language": i18n.language,
        ...(!form && body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw Object.assign(new Error(i18n.t("errors.network")), { status: 0, network: true });
  }
  const text = res.status === 204 ? "" : await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = undefined; }
  if (!res.ok) throw Object.assign(new Error(data?.message || i18n.t("errors.generic")), { status: res.status });
  if (data === undefined) throw Object.assign(new Error("Réponse invalide du serveur, vérifiez VITE_API_URL"), { status: res.status });
  return data;
}

export const http = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
  /** Envoi de fichier (multipart) : `file` est un File/Blob. */
  upload: (path, file) => { const f = new FormData(); f.append("file", file, file.type === "image/png" ? "image.png" : "photo.jpg"); return request("POST", path, undefined, f); },
};
