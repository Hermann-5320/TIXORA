import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiMapPin, FiShare2 } from "react-icons/fi";
import EventImage from "./EventImage";
import LikeButton from "./LikeButton";
import ShareModal from "./ShareModal";
import { StatusBadge } from "./ui";
import { categoryOf } from "../utils/categories";
import { dateBadge, fmtPrice, minPrice, seatsLeft } from "../utils/format";

export default function EventCard({ event, className = "" }) {
  const { t } = useTranslation();
  const [share, setShare] = useState(false);
  const cat = categoryOf(event.category);
  const badge = dateBadge(event.startsAt);
  const left = seatsLeft(event);
  const price = minPrice(event);
  const soldOut = left <= 0;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}>
      <div className="relative">
        <Link to={`/evenements/${event.id}`} aria-label={event.title}>
          <EventImage event={event} className="aspect-[16/10]" />
        </Link>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
          {cat.emoji} {t(`categories.${event.category}`)}
        </span>
        <div className="absolute right-3 top-3 rounded-xl bg-white px-2.5 py-1 text-center leading-tight text-slate-900 shadow">
          <div className="text-base font-extrabold">{badge.day}</div>
          <div className="text-[10px] font-bold uppercase text-slate-500">{badge.month}</div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button onClick={() => setShare(true)} aria-label={t("card.share")} title={t("card.share")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow transition hover:scale-105"><FiShare2 size={16} /></button>
          <LikeButton event={event} className="h-9 w-9 justify-center rounded-full bg-white/95 text-slate-700 shadow hover:scale-105" />
        </div>
        {event.ended && <span className="absolute bottom-3 left-3 badge bg-slate-900/85 text-white">{t("card.endedBadge")}</span>}
        {!event.ended && event.status !== "APPROVED" && (
          <span className="absolute bottom-3 left-3"><StatusBadge status={event.status}>{event.status === "PENDING" ? t("card.pending") : t("card.rejected")}</StatusBadge></span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug"><Link to={`/evenements/${event.id}`} className="hover:text-brand">{event.title}</Link></h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><FiMapPin size={14} className="shrink-0" /><span className="truncate">{[event.venue, event.city].filter(Boolean).join(", ")}</span></p>
        {event.distanceKm != null && <p className="mt-0.5 text-xs font-semibold text-accent">{t("nearby.away", { km: event.distanceKm })}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 mt-4">
          <div>
            <p className="text-xs text-muted">{t("common.from")}</p>
            <p className="font-bold">{price === 0 ? t("common.free") : fmtPrice(price)}</p>
          </div>
          {event.ended ? (
            <Link to={`/evenements/${event.id}`} className="btn-outline btn-sm">{t("common.view")}</Link>
          ) : soldOut ? (
            <span className="badge bg-surface-2 text-muted">{t("common.soldOut")}</span>
          ) : (
            <Link to={`/evenements/${event.id}`} className="btn-primary">{t("card.buy")}</Link>
          )}
        </div>
      </div>
      {share && <ShareModal event={event} open onClose={() => setShare(false)} />}
    </article>
  );
}
