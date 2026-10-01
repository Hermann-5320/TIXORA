import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCheck, FiEdit2, FiLock, FiSlash, FiTrash2, FiUnlock, FiX } from "react-icons/fi";
import { http } from "../api/http";
import { useToast } from "../context/ToastContext";
import EventForm from "../components/EventForm";
import { ConfirmDialog, EmptyState, ErrorText, Modal, Skeleton, StatusBadge } from "../components/ui";
import { fmtDate, fmtPrice, fmtShort } from "../utils/format";

const TABS = ["dashboard", "events", "users", "payments"];
const EVENT_FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"];
const ROLE_FILTERS = ["ALL", "CLIENT", "ORGANISATEUR", "CONTROLEUR"];
const STAT_ORDER = ["pendingEvents", "approvedEvents", "rejectedEvents", "clients", "organizers", "controllers", "blockedUsers", "ticketsSold", "revenue", "commission", "refundsNeeded"];
const ORDER_FILTERS = ["REFUND_NEEDED", "FAILED", "EXPIRED", "SUCCESS", "ALL"];
const MONEY = ["revenue", "commission"];

function Pager({ page, last, onPage }) {
  const { t } = useTranslation();
  if (page === 0 && last) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button className="btn-outline btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>{t("common.previous")}</button>
      <span className="text-sm text-muted">{t("admin.page", { page: page + 1 })}</span>
      <button className="btn-outline btn-sm" disabled={last} onClick={() => onPage(page + 1)}>{t("common.next")}</button>
    </div>
  );
}

function Dashboard({ onGo }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { http.get("/admin/stats").then(setStats).catch((e) => setError(e.message)); }, []);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!stats) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STAT_ORDER.map((k) => (
        <button key={k} onClick={() => (k === "pendingEvents" ? onGo("events") : k === "blockedUsers" || ["clients", "organizers", "controllers"].includes(k) ? onGo("users") : ["revenue", "commission", "refundsNeeded"].includes(k) ? onGo("payments") : null)}
          className={`card text-left ${(k === "pendingEvents" || k === "refundsNeeded") && stats[k] > 0 ? "!border-brand" : ""}`}>
          <p className="text-sm text-muted">{k === "commission" ? t("admin.stats.commission", { percent: stats.commissionPercent }) : t(`admin.stats.${k}`)}</p>
          <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{MONEY.includes(k) ? fmtPrice(stats[k]) : stats[k]}</p>
        </button>
      ))}
    </div>
  );
}

function EventsTab({ onChanged }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [correcting, setCorrecting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, size: 10, ...(status !== "ALL" && { status }), ...(term && { q: term }) });
    return http.get(`/admin/events?${qs}`).then(setData).catch((e) => { setError(e.message); setData({ items: [], last: true }); });
  }, [page, status, term]);
  useEffect(() => { setData(null); setError(""); load(); }, [load]);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); await load(); onChanged(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const approve = (ev) => act(() => http.post(`/admin/events/${ev.id}/approve`), t("admin.approvedOk"));
  const reject = async () => { await act(() => http.post(`/admin/events/${rejecting.id}/reject`, { reason }), t("admin.rejectedOk")); setRejecting(null); setReason(""); };
  const correct = async (payload, image) => {
    setBusy(true);
    try {
      await http.put(`/admin/events/${correcting.id}`, payload);
      if (image) await http.upload(`/events/${correcting.id}/image`, image);
      toast.success(t("admin.correctedOk"));
      setCorrecting(null);
      await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {EVENT_FILTERS.map((f) => <button key={f} className={`chip ${status === f ? "chip-active" : ""}`} onClick={() => { setStatus(f); setPage(0); }}>{t(`admin.filters.${f}`)}</button>)}
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(0); }}>
          <input className="input sm:!w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.searchEvents")} aria-label={t("admin.searchEvents")} />
        </form>
      </div>
      <ErrorText>{error}</ErrorText>
      {data === null && <Skeleton className="h-32" />}
      {data?.items.length === 0 && !error && <EmptyState icon="✅" title={t("admin.noEvents")} />}
      <div className="space-y-3">
        {data?.items.map((ev) => (
          <article key={ev.id} className="card !p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold"><Link to={`/evenements/${ev.id}`} className="hover:text-brand">{ev.title}</Link></h3>
                <p className="text-sm text-muted">{fmtDate(ev.startsAt)} - {[ev.venue, ev.city].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-muted">{t("admin.by", { name: ev.organizerName || "-" })} · {t(`categories.${ev.category}`)}</p>
                {ev.rejectionReason && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{ev.rejectionReason}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={ev.status}>{t(`organizer.status.${ev.status}`)}</StatusBadge>
                {ev.ended && <span className="badge bg-surface-2 text-muted"><FiLock className="mr-1" size={11} />{t("admin.lockedNote")}</span>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ev.status !== "APPROVED" && <button className="btn-primary btn-sm" disabled={busy} onClick={() => approve(ev)}><FiCheck size={13} />{t("admin.approve")}</button>}
              {ev.status !== "REJECTED" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => { setRejecting(ev); setReason(""); }}><FiX size={13} />{t("admin.reject")}</button>}
              <button className="btn-outline btn-sm" onClick={() => setCorrecting(ev)}><FiEdit2 size={13} />{t("admin.correct")}</button>
            </div>
          </article>
        ))}
      </div>
      {data && <Pager page={page} last={data.last} onPage={setPage} />}

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={t("admin.rejectTitle")} subtitle={t("admin.rejectHint")}>
        <label className="block text-sm font-medium">{t("admin.rejectReason")}
          <textarea className="input mt-1" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setRejecting(null)}>{t("common.cancel")}</button>
          <button className="btn-danger" disabled={busy || !reason.trim()} onClick={reject}>{t("admin.reject")}</button>
        </div>
      </Modal>

      <Modal open={Boolean(correcting)} onClose={() => setCorrecting(null)} title={t("admin.correct")} subtitle={correcting?.title} wide>
        {correcting && <EventForm initial={correcting} onSubmit={correct} onCancel={() => setCorrecting(null)} busy={busy} submitLabel={t("organizer.saveChanges")} />}
      </Modal>
    </>
  );
}

function UsersTab({ onChanged }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [role, setRole] = useState("ALL");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // { kind: "block" | "delete", user }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, size: 10, ...(role !== "ALL" && { role }), ...(term && { q: term }) });
    return http.get(`/admin/users?${qs}`).then(setData).catch((e) => { setError(e.message); setData({ items: [], last: true }); });
  }, [page, role, term]);
  useEffect(() => { setData(null); setError(""); load(); }, [load]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); await load(); onChanged(); } catch (e) { toast.error(e.message); } finally { setBusy(false); setConfirm(null); }
  };
  const nameOf = (u) => `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
  const unblock = (u) => run(() => http.post(`/admin/users/${u.id}/unblock`), t("admin.userUnblocked"));
  const doConfirm = () => (confirm.kind === "block"
    ? run(() => http.post(`/admin/users/${confirm.user.id}/block`), t("admin.userBlocked"))
    : run(() => http.del(`/admin/users/${confirm.user.id}`), t("admin.userDeleted")));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((f) => <button key={f} className={`chip ${role === f ? "chip-active" : ""}`} onClick={() => { setRole(f); setPage(0); }}>{t(`admin.roles.${f}`)}</button>)}
        <form className="w-full sm:ml-auto sm:w-auto" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(0); }}>
          <input className="input sm:!w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.searchUsers")} aria-label={t("admin.searchUsers")} />
        </form>
      </div>
      <ErrorText>{error}</ErrorText>
      {data === null && <Skeleton className="h-32" />}
      {data?.items.length === 0 && !error && <EmptyState icon="👤" title={t("admin.noUsers")} />}
      <div className="space-y-3">
        {data?.items.map((u) => (
          <article key={u.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
            <div className="min-w-0">
              <p className="font-semibold">{nameOf(u)} {u.organization && <span className="font-normal text-muted">· {u.organization}</span>}</p>
              <p className="truncate text-sm text-muted">{u.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="badge bg-surface-2 text-fg">{t(`admin.roles.${u.role}`)}</span>
                <StatusBadge status={u.status}>{t(`admin.userStatus.${u.status}`)}</StatusBadge>
                {u.createdAt && t("admin.joined", { date: fmtShort(u.createdAt) })}
              </p>
            </div>
            {u.role === "ADMIN" ? <span className="text-xs text-muted">{t("admin.protectedAccount")}</span> : (
              <div className="flex gap-2">
                {u.status === "BLOCKED"
                  ? <button className="btn-outline btn-sm" disabled={busy} onClick={() => unblock(u)}><FiUnlock size={13} />{t("admin.unblock")}</button>
                  : <button className="btn-outline btn-sm" onClick={() => setConfirm({ kind: "block", user: u })}><FiSlash size={13} />{t("admin.block")}</button>}
                <button className="btn-outline btn-sm !text-red-600 dark:!text-red-400" onClick={() => setConfirm({ kind: "delete", user: u })}><FiTrash2 size={13} />{t("common.delete")}</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {data && <Pager page={page} last={data.last} onPage={setPage} />}
      <ConfirmDialog open={Boolean(confirm)} danger busy={busy} onClose={() => setConfirm(null)} onConfirm={doConfirm}
        title={confirm?.kind === "delete" ? t("admin.deleteTitle") : t("admin.blockTitle")}
        text={confirm ? t(confirm.kind === "delete" ? "admin.deleteText" : "admin.blockText", { name: nameOf(confirm.user) }) : ""}
        confirmLabel={confirm?.kind === "delete" ? t("common.delete") : t("admin.block")} />
    </>
  );
}


function PaymentsTab() {
  const { t } = useTranslation();
  const [payouts, setPayouts] = useState(null);
  const [status, setStatus] = useState("REFUND_NEEDED");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { http.get("/admin/payouts").then(setPayouts).catch((e) => { setError(e.message); setPayouts([]); }); }, []);
  useEffect(() => {
    const qs = new URLSearchParams({ page, size: 10, ...(status !== "ALL" && { status }) });
    http.get(`/admin/orders?${qs}`).then(setData).catch((e) => { setError(e.message); setData({ items: [], last: true }); });
  }, [page, status]);

  const sum = (k) => (payouts || []).reduce((n, p) => n + p[k], 0);
  return (
    <>
      <ErrorText>{error}</ErrorText>
      <h2 className="mb-1 text-lg font-bold">{t("adminPay.payoutsTitle")}</h2>
      <p className="mb-3 text-sm text-muted">{t("adminPay.payoutsHelp")}</p>
      {payouts === null && <Skeleton className="h-24" />}
      {payouts?.length === 0 && <EmptyState icon="💸" title={t("adminPay.noPayouts")} />}
      <div className="space-y-3">
        {payouts?.map((p) => (
          <article key={p.organizerId} className="card !p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="truncate text-sm text-muted">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p></div>
              <p className="text-xs text-muted">{t("adminPay.tickets", { count: p.ticketsSold })}</p>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-3">
              <div><dt className="text-xs text-muted">{t("adminPay.revenue")}</dt><dd className="font-semibold">{fmtPrice(p.revenue)}</dd></div>
              <div><dt className="text-xs text-muted">{t("adminPay.commission")}</dt><dd className="font-semibold text-muted">- {fmtPrice(p.commission)}</dd></div>
              <div><dt className="text-xs text-muted">{t("adminPay.net")}</dt><dd className="font-extrabold text-green-600 dark:text-green-400">{fmtPrice(p.net)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      {payouts?.length > 0 && (
        <p className="mt-3 flex flex-wrap justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold">
          <span>{t("adminPay.totals")}</span><span>{fmtPrice(sum("revenue"))} · {t("adminPay.commission")} {fmtPrice(sum("commission"))} · {t("adminPay.net")} {fmtPrice(sum("net"))}</span>
        </p>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold">{t("adminPay.ordersTitle")}</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_FILTERS.map((f) => <button key={f} className={`chip ${status === f ? "chip-active" : ""}`} onClick={() => { setStatus(f); setPage(0); }}>{t(`adminPay.status.${f}`)}</button>)}
      </div>
      {data === null && <Skeleton className="h-24" />}
      {data?.items.length === 0 && <EmptyState icon="✅" title={t("adminPay.noOrders")} />}
      <div className="space-y-3">
        {data?.items.map((o) => (
          <article key={o.id} className="card !p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold">{o.eventTitle}</p><p className="truncate text-muted">{o.buyerEmail} · {o.phone}</p></div>
              <StatusBadge status={o.status === "SUCCESS" ? "APPROVED" : o.status === "REFUND_NEEDED" ? "REJECTED" : "PENDING"}>{t(`adminPay.status.${o.status}`)}</StatusBadge>
            </div>
            <p className="mt-2 text-muted">{fmtPrice(o.subtotal)} + {fmtPrice(o.fees)} = <span className="font-semibold text-fg">{fmtPrice(o.total)}</span> · {fmtDate(o.createdAt)}</p>
            {o.processCode && <p className="mt-1 break-all font-mono text-xs text-muted">{o.processCode}</p>}
            {o.failureReason && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{o.failureReason}</p>}
          </article>
        ))}
      </div>
      {data && <Pager page={page} last={data.last} onPage={setPage} />}
    </>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("dashboard");
  const [pending, setPending] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const loadPending = useCallback(() => http.get("/admin/stats").then((s) => setPending(s.pendingEvents)).catch(() => {}), []);
  useEffect(() => { loadPending(); }, [loadPending, refresh]);
  const changed = useCallback(() => setRefresh((n) => n + 1), []);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{t("admin.title")}</h1>
        <p className="text-muted">{t("admin.subtitle")}</p>
      </header>
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 sm:w-fit" role="tablist">
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`shrink-0 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${tab === k ? "bg-surface text-brand shadow-sm" : "text-muted"}`}>
            {t(`admin.tabs.${k}`)}{k === "events" && pending > 0 && <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{pending}</span>}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <Dashboard key={refresh} onGo={setTab} />}
      {tab === "events" && <EventsTab onChanged={changed} />}
      {tab === "users" && <UsersTab onChanged={changed} />}
      {tab === "payments" && <PaymentsTab />}
    </>
  );
}
