import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiCalendar, FiClock, FiExternalLink, FiLock, FiMapPin, FiShare2, FiUser } from "react-icons/fi";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import EventImage from "../components/EventImage";
import LikeButton from "../components/LikeButton";
import ShareModal from "../components/ShareModal";
import { ErrorText, Field, Skeleton, StatusBadge } from "../components/ui";
import PaymentModal from "../components/PaymentModal";
import useConfig, { totalWithFees } from "../hooks/useConfig";
import { categoryOf } from "../utils/categories";
import { fmtDay, fmtPrice, fmtTime } from "../utils/format";

const EventsMap = lazy(() => import("../components/EventsMap"));
const noop = () => {};

function Banner({ tone, children }) {
  const tones = { info: "bg-amber-500/15 text-amber-800 dark:text-amber-300", danger: "bg-red-500/10 text-red-700 dark:text-red-400", locked: "bg-surface-2 text-muted" };
  return <p role="status" className={`mb-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${tones[tone]}`}>{tone === "locked" && <FiLock />}{children}</p>;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [qty, setQty] = useState({});
  const config = useConfig();
  const [operators, setOperators] = useState([]);
  const [method, setMethod] = useState("");
  const [order, setOrder] = useState(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);

  useEffect(() => {
    setEvent(null);
    setError("");
    http.get(`/events/${id}`).then(setEvent).catch((e) => setError(e.status === 404 ? t("detail.notFound") : e.message));
    window.scrollTo({ top: 0 });
  }, [id, t]);

  // Opérateurs Mobile Money (récupérés auprès de CT Pay par le serveur) pour les clients connectés.
  useEffect(() => {
    if (user?.role !== "CLIENT") return;
    http.get("/payments/operators").then((ops) => { setOperators(ops); setMethod((m) => m || ops[0]?.key || ""); }).catch(() => setOperators([]));
  }, [user]);

  const onPaid = useCallback(() => { toast.success("🎟️ " + t("pay.success")); setTimeout(() => navigate("/mes-billets"), 900); }, [toast, t, navigate]);

  if (error && !event) {
    return <div className="py-10"><ErrorText>{error}</ErrorText><Link to="/evenements" className="btn-outline mt-4"><FiArrowLeft />{t("detail.backToEvents")}</Link></div>;
  }
  if (!event) return <div className="space-y-4"><Skeleton className="h-72 w-full !rounded-2xl" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 w-full" /></div>;

  const cat = categoryOf(event.category);
  const items = Object.entries(qty).filter(([, n]) => n > 0).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
  const subtotal = items.reduce((s, i) => s + i.quantity * event.ticketTypes.find((c) => c.id === i.ticketTypeId).price, 0);
  const total = totalWithFees(subtotal, config?.feePercent ?? 3);
  const fees = total - subtotal;
  const change = (type, delta) => setQty((q) => ({ ...q, [type.id]: Math.max(0, Math.min(type.capacity - type.sold, (q[type.id] || 0) + delta)) }));
  const saleOpen = event.status === "APPROVED" && !event.ended;
  const canBuy = saleOpen && (!user || user.role === "CLIENT");
  const place = [event.venue, event.city].filter(Boolean).join(", ");

  const buy = async () => {
    if (!user) return navigate("/connexion", { state: { from: location, needLogin: true } });
    setBusy(true);
    setError("");
    try {
      const created = await http.post("/orders", { eventId: event.id, items, payment: { operatorKey: method, phone } });
      if (created.status === "SUCCESS") { onPaid(); return; } // événement gratuit : billets émis tout de suite
      setOrder(created);
    } catch (err) {
      setError(err.message);
      http.get(`/events/${id}`).then(setEvent).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/evenements" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"><FiArrowLeft size={15} />{t("detail.backToEvents")}</Link>

      <EventImage event={event} className="aspect-[4/3] rounded-2xl sm:aspect-[21/9] lg:aspect-[21/8]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-8">
          <div className="text-white">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">{cat.emoji} {t(`categories.${event.category}`)}</span>
            <h1 className="mt-3 text-2xl font-extrabold drop-shadow sm:text-4xl">{event.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LikeButton event={event} showCount className="rounded-full bg-white/95 px-3.5 py-2 text-slate-800 shadow" />
            <button onClick={() => setShare(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow"><FiShare2 size={15} />{t("card.share")}</button>
          </div>
        </div>
      </EventImage>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {event.ended && <Banner tone="locked">{t("detail.endedBanner")}</Banner>}
          {event.status === "PENDING" && <Banner tone="info">{t("detail.pendingBanner")}</Banner>}
          {event.status === "REJECTED" && <Banner tone="danger">{t("detail.rejectedBanner", { reason: event.rejectionReason })}</Banner>}

          <div className="grid gap-3 sm:grid-cols-3">
            {[[FiCalendar, t("detail.dateLabel"), fmtDay(event.startsAt)], [FiClock, "", `${fmtTime(event.startsAt)}${event.endsAt ? ` - ${fmtTime(event.endsAt)}` : ""}`], [FiMapPin, t("detail.placeLabel"), place]].map(([Icon, label, value], i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon size={17} /></span>
                <div className="min-w-0 text-sm">{label && <p className="text-xs text-muted">{label}</p>}<p className="font-semibold capitalize-first">{value}</p></div>
              </div>
            ))}
          </div>

          {event.organizerName && <p className="mt-5 flex items-center gap-2 text-sm text-muted"><FiUser size={15} />{t("detail.organizer")} <span className="font-semibold text-fg">{event.organizerName}</span></p>}

          {event.description && (<><h2 className="mb-2 mt-8 text-lg font-bold">{t("detail.description")}</h2><p className="whitespace-pre-line text-muted">{event.description}</p></>)}

          <h2 className="mb-3 mt-8 text-lg font-bold">{t("detail.tickets")}</h2>
          <div className="space-y-3">
            {event.ticketTypes.map((type) => {
              const left = type.capacity - type.sold;
              return (
                <div key={type.id} className="card flex items-center justify-between gap-4 !p-4">
                  <div>
                    <p className="font-semibold">{type.name}</p>
                    <p className="text-sm text-muted">{fmtPrice(type.price)} - {left > 0 ? t("detail.remaining", { count: left }) : t("common.soldOut")}</p>
                  </div>
                  {canBuy && (
                    <div className="flex items-center gap-3">
                      <button className="btn-outline !px-3" disabled={!qty[type.id]} onClick={() => change(type, -1)} aria-label={`- ${type.name}`}>-</button>
                      <span className="w-6 text-center font-semibold" aria-live="polite">{qty[type.id] || 0}</span>
                      <button className="btn-outline !px-3" disabled={left === 0 || (qty[type.id] || 0) >= left} onClick={() => change(type, 1)} aria-label={`+ ${type.name}`}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {event.latitude != null && (
            <>
              <div className="mb-3 mt-8 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t("detail.location")}</h2>
                <a className="inline-flex items-center gap-1 text-sm font-semibold text-brand" target="_blank" rel="noopener noreferrer"
                  href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`}>{t("detail.openMap")}<FiExternalLink size={14} /></a>
              </div>
              <Suspense fallback={<Skeleton className="h-64 w-full !rounded-2xl" />}><EventsMap events={[event]} onOpen={noop} className="h-64" /></Suspense>
            </>
          )}
        </section>

        <aside className="card h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">{t("detail.summary")}</h2>
          {!saleOpen && <p className="text-sm text-muted">{event.ended ? t("detail.endedBanner") : t("detail.pendingBanner")}</p>}
          {saleOpen && !canBuy && <p className="text-sm text-muted">{t("detail.onlyClients")}</p>}
          {canBuy && items.length === 0 && <p className="text-sm text-muted">{t("detail.selectAtLeast")}</p>}
          {canBuy && items.length > 0 && (
            <>
              <ul className="space-y-1 text-sm">
                {items.map((i) => {
                  const type = event.ticketTypes.find((c) => c.id === i.ticketTypeId);
                  return <li key={i.ticketTypeId} className="flex justify-between"><span>{i.quantity} x {type.name}</span><span>{fmtPrice(i.quantity * type.price)}</span></li>;
                })}
              </ul>
              {fees > 0 && (
                <ul className="space-y-1 border-t border-line pt-3 text-sm text-muted">
                  <li className="flex justify-between"><span>{t("detail.subtotal")}</span><span>{fmtPrice(subtotal)}</span></li>
                  <li className="flex justify-between"><span>{t("detail.fees")}</span><span>{fmtPrice(fees)}</span></li>
                </ul>
              )}
              <p className="flex justify-between border-t border-line pt-3 font-bold"><span>{t("detail.total")}</span><span>{fmtPrice(total)}</span></p>
              {user && total > 0 && (
                <>
                  <label className="block text-sm font-medium">{t("detail.paymentMethod")}
                    <select className="input mt-1" value={method} onChange={(e) => setMethod(e.target.value)} required>
                      {operators.length === 0 && <option value="">{t("common.loading")}</option>}
                      {operators.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
                    </select>
                  </label>
                  <Field label={t("detail.paymentNumber")} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="6XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} hint={t("detail.paymentHint")} required />
                  {config?.paymentMode === "simulate" && <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">{t("detail.simulateNotice")}</p>}
                </>
              )}
              <ErrorText>{error}</ErrorText>
              <button className="btn-primary w-full" disabled={busy || (user && total > 0 && (!phone || !method))} onClick={buy}>
                {!user ? t("detail.loginToBuy") : busy ? t("detail.paying") : t("detail.pay", { total: fmtPrice(total) })}
              </button>
            </>
          )}
          {error && items.length === 0 && <ErrorText>{error}</ErrorText>}
        </aside>
      </div>

      {share && <ShareModal event={event} open onClose={() => setShare(false)} />}
      {order && <PaymentModal order={order} onSuccess={onPaid} onClose={() => { setOrder(null); setBusy(false); http.get(`/events/${id}`).then(setEvent).catch(() => {}); }} />}
      {event.status !== "APPROVED" && <div className="mt-6"><StatusBadge status={event.status}>{t(`organizer.status.${event.status}`)}</StatusBadge></div>}
    </>
  );
}
