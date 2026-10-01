import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiCheckCircle, FiSmartphone } from "react-icons/fi";
import { http } from "../api/http";
import { Modal } from "./ui";
import { fmtPrice } from "../utils/format";

const POLL_MS = 3000;

/**
 * Attente de la validation du paiement Mobile Money : le client confirme avec son code PIN sur son téléphone,
 * on interroge le serveur toutes les 3 s (le serveur vérifie auprès de CT Pay). Les billets arrivent après le succès.
 */
export default function PaymentModal({ order, onSuccess, onClose }) {
  const { t } = useTranslation();
  const [state, setState] = useState(order);
  const [left, setLeft] = useState(() => Math.max(0, Math.round((new Date(order.expiresAt) - Date.now()) / 1000)));
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await http.get(`/orders/${order.id}`);
        if (!alive) return;
        setState(next);
        if (next.status === "SUCCESS" && !done.current) { done.current = true; onSuccess(next); }
        else if (next.status === "PENDING") timer = setTimeout(tick, POLL_MS);
      } catch {
        if (alive) timer = setTimeout(tick, POLL_MS * 2); // coupure réseau passagère
      }
    };
    let timer = setTimeout(tick, POLL_MS);
    const clock = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { alive = false; clearTimeout(timer); clearInterval(clock); };
  }, [order.id, onSuccess]);

  const pending = state.status === "PENDING";
  const ok = state.status === "SUCCESS";
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <Modal open onClose={pending ? () => {} : onClose} title={t("pay.title")} subtitle={fmtPrice(state.total)}>
      <div className="py-4 text-center" role="status" aria-live="polite">
        {pending && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand"><FiSmartphone size={30} className="animate-pulse" /></div>
            <p className="text-lg font-bold">{t("pay.confirmOnPhone")}</p>
            <p className="mt-2 text-sm text-muted">{t("pay.confirmHelp")}</p>
            <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2"><div className="h-full w-1/3 animate-[tx-bar_1.4s_ease-in-out_infinite] rounded-full bg-brand" /></div>
            <p className="mt-3 text-xs text-muted">{t("pay.timeLeft", { time: mmss })}</p>
          </>
        )}
        {ok && (
          <>
            <FiCheckCircle size={52} className="mx-auto mb-3 text-green-500" />
            <p className="text-lg font-bold">{t("pay.success")}</p>
          </>
        )}
        {!pending && !ok && (
          <>
            <FiAlertTriangle size={48} className="mx-auto mb-3 text-amber-500" />
            <p className="text-lg font-bold">{state.status === "EXPIRED" ? t("pay.expired") : t("pay.failed")}</p>
            <p className="mt-1 text-sm text-muted">{state.status === "REFUND_NEEDED" ? t("pay.refund") : state.failureReason || t("pay.failedHelp")}</p>
            <button className="btn-primary mt-5" onClick={onClose}>{t("pay.retry")}</button>
          </>
        )}
      </div>
    </Modal>
  );
}
