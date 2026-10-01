import { useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export function Field({ label, hint, ...props }) {
  return (
    <label className="block text-sm font-medium text-fg">
      {label}
      <input className="input mt-1" {...props} />
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function PasswordField({ label, ...props }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm font-medium text-fg">
      {label}
      <span className="relative mt-1 block">
        <input className="input !pr-10" type={show ? "text" : "password"} {...props} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-fg"
          aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}>
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </span>
    </label>
  );
}

export const Spinner = () => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center py-16" role="status" aria-label={t("common.loading")}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" />
    </div>
  );
};

export const ErrorText = ({ children }) =>
  children ? <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{children}</p> : null;

export const SuccessText = ({ children }) =>
  children ? <p role="status" className="rounded-xl bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">{children}</p> : null;

export function AuthCard({ title, subtitle, footer, children }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="card">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
      <p className="mt-4 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}

export const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <Skeleton className="aspect-[16/10] !rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-3"><Skeleton className="h-5 w-20" /><Skeleton className="h-9 w-24" /></div>
      </div>
    </div>
  );
}

export const EventGridSkeleton = ({ count = 6 }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: count }, (_, i) => <EventCardSkeleton key={i} />)}</div>
);

export function EmptyState({ icon, title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="text-xs text-muted">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-fg"><FiX size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, danger, busy, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{text}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>{confirmLabel || t("common.confirm")}</button>
      </div>
    </Modal>
  );
}

const STATUS_STYLES = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  APPROVED: "bg-green-500/15 text-green-700 dark:text-green-400",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-400",
  ACTIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
  BLOCKED: "bg-red-500/15 text-red-700 dark:text-red-400",
};
export const StatusBadge = ({ status, children }) => <span className={`badge ${STATUS_STYLES[status] || "bg-surface-2 text-muted"}`}>{children}</span>;
