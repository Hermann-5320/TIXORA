import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiArrowRight, FiCloudOff, FiLock, FiMapPin, FiSearch, FiSmartphone } from "react-icons/fi";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";
import EventCard from "../components/EventCard";
import { EventGridSkeleton, EventCardSkeleton } from "../components/ui";
import { CATEGORIES, CITIES } from "../utils/categories";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const rail = useRef(null);

  useEffect(() => {
    http.get("/stats").then(setStats).catch(() => setStats(null));
    http.get("/events/featured").then(setFeatured).catch(() => setFeatured([]));
    http.get("/events?size=6").then((p) => setUpcoming(p.items)).catch(() => setUpcoming([]));
  }, []);

  const search = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city) p.set("city", city);
    navigate(`/evenements${p.size ? `?${p}` : ""}`);
  };
  const scroll = useCallback((dir) => rail.current?.scrollBy({ left: dir * (rail.current.clientWidth * 0.8), behavior: "smooth" }), []);

  const how = [
    [FiLock, "howQrTitle", "howQrText"], [FiSmartphone, "howPayTitle", "howPayText"],
    [FiCloudOff, "howOfflineTitle", "howOfflineText"], [FiMapPin, "howNearTitle", "howNearText"],
  ];

  return (
    <div className="-mx-4 -mt-8">
      {/* Hero */}
      <section className="relative overflow-hidden bg-nav text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            🎉 {stats?.events > 0 ? t("home.badgeCount", { count: stats.events }) : t("home.badgeDefault")}
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">{t("home.title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/75">{t("home.subtitle")}</p>
          <form onSubmit={search} className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row" role="search">
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
              <FiSearch className="text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("home.searchPlaceholder")} aria-label={t("home.searchPlaceholder")}
                className="w-full bg-transparent py-3 text-sm text-slate-900 placeholder-slate-500 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3">
              <FiMapPin className="text-red-500" />
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label={t("events.city")} className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none">
                <option value="">{t("home.allCities")}</option>
                {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <button className="btn-primary !px-6 !py-3">{t("home.searchBtn")}</button>
          </form>
        </div>
      </section>

      {/* Tendances */}
      <section className="border-b border-line bg-surface">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3">
          <span className="shrink-0 pr-2 text-xs font-bold uppercase tracking-wider text-muted">{t("home.trends")}</span>
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/evenements?category=${c.id}`} className="chip shrink-0">{c.emoji} {t(`categories.${c.id}`)}</Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14">
        {/* Vedettes */}
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">{t("home.featuredKicker")}</p>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.featuredTitle")}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scroll(-1)} aria-label={t("common.previous")} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface hover:bg-surface-2"><FiArrowLeft /></button>
              <button onClick={() => scroll(1)} aria-label={t("common.next")} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface hover:bg-surface-2"><FiArrowRight /></button>
            </div>
          </div>
          <div ref={rail} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2">
            {featured === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="w-[300px] shrink-0 sm:w-[340px]"><EventCardSkeleton /></div>)}
            {featured?.length === 0 && <p className="text-muted">{t("home.noFeatured")}</p>}
            {featured?.map((ev) => <div key={ev.id} className="w-[300px] shrink-0 snap-start sm:w-[340px]"><EventCard event={ev} className="h-full" /></div>)}
          </div>
        </section>

        {/* Réassurance */}
        <section className="grid gap-6 rounded-3xl bg-brand-soft p-8 sm:grid-cols-2 lg:grid-cols-4">
          {how.map(([Icon, title, text]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-sm"><Icon size={20} /></span>
              <div><h3 className="font-bold">{t(`home.${title}`)}</h3><p className="text-sm text-muted">{t(`home.${text}`)}</p></div>
            </div>
          ))}
        </section>

        {/* Prochains */}
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">{t("home.upcomingKicker")}</p>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.upcomingTitle")}</h2>
            </div>
            <Link to="/evenements" className="text-sm font-semibold text-brand hover:underline">{t("common.seeAll")} →</Link>
          </div>
          {upcoming === null ? <EventGridSkeleton /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
          )}
        </section>

        {/* CTA organisateurs */}
        {(!user || user.role === "ORGANISATEUR") && (
          <section className="relative overflow-hidden rounded-3xl bg-nav p-10 text-center text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-violet-600/40 blur-3xl" />
            <h2 className="relative text-2xl font-extrabold sm:text-3xl">{t("home.ctaTitle")}</h2>
            <p className="relative mx-auto mt-2 max-w-xl text-white/75">{t("home.ctaText")}</p>
            <Link to={user ? "/organisateur" : "/inscription?role=ORGANISATEUR"} className="btn-primary relative mt-6 !px-6 !py-3">{t("home.ctaButton")}</Link>
          </section>
        )}
      </div>
    </div>
  );
}
