import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { FiDownload, FiWifiOff } from "react-icons/fi";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EmptyState, ErrorText, Skeleton } from "../components/ui";
import TicketCard from "../components/TicketCard";
import { fmtDate, fmtPrice } from "../utils/format";
import { downloadTicketPdf } from "../utils/pdf";

const HOURS_6 = 6 * 3600 * 1000;

export default function MyTickets() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const cacheKey = `tx_tickets_${user.id}`;
  const [tickets, setTickets] = useState(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());

  // Les billets sont enregistrés sur l'appareil : les QR codes restent affichables sans connexion (effacés à la déconnexion).
  useEffect(() => {
    http.get("/tickets/mine").then((list) => { setTickets(list); setOffline(false); try { localStorage.setItem(cacheKey, JSON.stringify(list)); } catch { /* quota */ } })
      .catch((e) => {
        const cached = (() => { try { return JSON.parse(localStorage.getItem(cacheKey)); } catch { return null; } })();
        if (e.network && cached) { setTickets(cached); setOffline(true); } else { setError(e.message); setTickets([]); }
      });
  }, [cacheKey]);

  const { upcoming, past } = useMemo(() => {
    const limit = now - HOURS_6;
    const list = tickets || [];
    return { upcoming: list.filter((x) => new Date(x.startsAt).getTime() >= limit), past: list.filter((x) => new Date(x.startsAt).getTime() < limit) };
  }, [tickets, now]);

  const pdf = (ticket) => downloadTicketPdf(ticket,
    { title: t("tickets.pdfTitle"), category: t("tickets.pdfCategory"), code: t("tickets.pdfCode"), price: t("tickets.pdfPrice") },
    { date: fmtDate, price: fmtPrice }).catch(() => toast.error(t("errors.generic")));

  const card = (tk, dim) => (
    <TicketCard key={tk.id} ticket={tk} dim={dim}>
      <button onClick={() => pdf(tk)} className="btn-outline btn-sm mt-2"><FiDownload size={14} />{t("tickets.download")}</button>
    </TicketCard>
  );

  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">{t("tickets.title")}</h1>
      {offline && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300"><FiWifiOff />{t("tickets.offlineNotice")}</p>}
      <ErrorText>{error}</ErrorText>
      {tickets === null && <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>}
      {tickets?.length === 0 && !error && <EmptyState icon="🎟️" title={t("tickets.empty")}><Link to="/evenements" className="font-semibold text-brand">{t("tickets.discover")}</Link></EmptyState>}
      {upcoming.length > 0 && (<><h2 className="mb-3 text-lg font-bold">{t("tickets.upcoming")}</h2><div className="grid gap-6 lg:grid-cols-2">{upcoming.map((x) => card(x, false))}</div></>)}
      {past.length > 0 && (<><h2 className="mb-3 mt-10 text-lg font-bold">{t("tickets.past")}</h2><div className="grid gap-6 lg:grid-cols-2">{past.map((x) => card(x, true))}</div></>)}
    </>
  );
}
