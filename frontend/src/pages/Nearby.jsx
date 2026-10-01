import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCrosshair } from "react-icons/fi";
import { http } from "../api/http";
import EventsMap from "../components/EventsMap";
import EventCard from "../components/EventCard";
import { EmptyState, ErrorText, EventGridSkeleton } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { CAMEROON_CENTER } from "../utils/categories";

const RADIUS = [10, 25, 50, 100, 250];

export default function Nearby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [radius, setRadius] = useState(50);
  const [result, setResult] = useState(null); // { key, list } : la clé identifie la recherche qui a produit la liste
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  // Sans position : tous les événements géolocalisés du pays. Avec position : ceux du rayon choisi, du plus proche au plus loin.
  const key = me ? `${me.lat},${me.lng},${radius}` : "all";
  useEffect(() => {
    let cancelled = false;
    const [lat, lng, km] = me ? [me.lat, me.lng, radius] : [CAMEROON_CENTER.lat, CAMEROON_CENTER.lng, 1500];
    http.get(`/events/nearby?lat=${lat}&lng=${lng}&radiusKm=${km}`)
      .then((list) => !cancelled && setResult({ key, list: me ? list : list.map((e) => ({ ...e, distanceKm: null })) }))
      .catch((e) => { if (!cancelled) { setError(e.message); setResult({ key, list: [] }); } });
    return () => { cancelled = true; };
  }, [me, radius, key]);
  const events = result?.key === key ? result.list : null;

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t("nearby.geoUnsupported"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      (err) => { setLocating(false); toast.error(err.code === 1 ? t("nearby.geoDenied") : t("nearby.geoFailed")); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const open = useCallback((ev) => navigate(`/evenements/${ev.id}`), [navigate]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t("nearby.title")}</h1>
          <p className="text-muted">{t("nearby.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {me && (
            <label className="flex items-center gap-2 text-sm font-medium">{t("nearby.radius")}
              <select className="input !w-auto" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADIUS.map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </label>
          )}
          <button className="btn-primary" onClick={locate} disabled={locating}><FiCrosshair size={16} />{locating ? t("nearby.locating") : t("nearby.locate")}</button>
        </div>
      </header>

      <ErrorText>{error}</ErrorText>
      <EventsMap events={events || []} me={me} radiusKm={radius} onOpen={open} className="h-[300px] sm:h-[440px]" />

      {events && (
        <p className="mb-4 mt-6 text-sm font-medium text-muted" aria-live="polite">
          {me ? t("nearby.found", { count: events.length, radius }) : t("nearby.all", { count: events.length })}
        </p>
      )}
      {events === null ? <div className="mt-6"><EventGridSkeleton count={3} /></div> : events.length === 0 ? (
        <EmptyState icon="📍" title={t("nearby.none")} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{events.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
      )}
    </>
  );
}
