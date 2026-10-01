import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const STYLES = {
  success: ["border-green-500/40", "text-green-600 dark:text-green-400", FiCheckCircle],
  error: ["border-red-500/40", "text-red-600 dark:text-red-400", FiAlertCircle],
  info: ["border-line", "text-accent", FiInfo],
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const [border, color, Icon] = STYLES[t.type];
          return (
            <div key={t.id} role="status" className={`tx-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3 text-sm text-fg shadow-lg ${border}`}>
              <Icon className={`mt-0.5 shrink-0 ${color}`} size={18} />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="text-muted hover:text-fg"><FiX size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
