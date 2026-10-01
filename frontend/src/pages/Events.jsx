import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSearch } from "react-icons/fi";
import { http } from "../api/http";
import EventCard from "../components/EventCard";
import { EmptyState, ErrorText, EventGridSkeleton } from "../components/ui";
import { CATEGORIES, CITIES } from "../utils/categories";

const PAGE = 12;

export default function Events() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "", category = params.get("category") || "", city = params.get("city") || "";
  const [text, setText] = useState(q);
  const [data, setData] = useState({ items: [], total: 0, last: true });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setText(q); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ size: PAGE, page: 0, ...(q && { q }), ...(category && { category }), ...(city && { city }) });
    http.get(`/events?${qs}`).then((r) => !cancelled && setData(r)).catch((e) => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [q, category, city]);

  const loadMore = useCallback(async () => {
    setMore(true);
    try {
      const qs = new URLSearchParams({ size: PAGE, page: Math.floor(data.items.length / PAGE), ...(q && { q }), ...(category && { category }), ...(city && { city }) });
      const r = await http.get(`/events?${qs}`);
      setData((d) => ({ ...r, items: [...d.items, ...r.items] }));
    } catch (e) { setError(e.message); } finally { setMore(false); }
  }, [data.items.length, q, category, city]);

  const update = (key, value) => setParams((p) => { const n = new URLSearchParams(p); if (value) n.set(key, value); else n.delete(key); return n; }, { replace: true });
  const filtered = q || category || city;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{t("events.title")}</h1>
        <p className="text-muted">{t("events.subtitle")}</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); update("q", text.trim()); }} className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("nav.searchPlaceholder")} aria-label={t("nav.searchPlaceholder")} />
        </label>
        <select className="input sm:w-56" value={city} onChange={(e) => update("city", e.target.value)} aria-label={t("events.city")}>
          <option value="">{t("home.allCities")}</option>
          {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <button className="btn-primary">{t("common.search")}</button>
      </form>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("events.category")}>
        <button className={`chip shrink-0 ${!category ? "chip-active" : ""}`} onClick={() => update("category", "")}>{t("common.all")}</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`chip shrink-0 ${category === c.id ? "chip-active" : ""}`} onClick={() => update("category", c.id)} aria-pressed={category === c.id}>
            {c.emoji} {t(`categories.${c.id}`)}
          </button>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>
      {!loading && !error && <p className="mb-4 text-sm text-muted" aria-live="polite">{t("events.results", { count: data.total })}</p>}

      {loading ? <EventGridSkeleton /> : data.items.length === 0 && !error ? (
        <EmptyState icon="🔎" title={t("events.empty")}>
          {filtered && <Link to="/evenements" className="font-semibold text-brand">{t("events.reset")}</Link>}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
          {!data.last && (
            <div className="mt-8 text-center"><button className="btn-outline" onClick={loadMore} disabled={more}>{more ? t("common.loading") : t("common.loadMore")}</button></div>
          )}
        </>
      )}
    </>
  );
}
