import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { FiCrosshair, FiSearch } from "react-icons/fi";
import { CAMEROON_CENTER, CITIES } from "../utils/categories";
import { TILES } from "../utils/map";
import { http, MOCK } from "../api/http";

const pin = () => L.divIcon({ className: "tx-pin", html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 26] });

/** Sélecteur de position : clic sur la carte, marqueur déplaçable, recherche d'un lieu (Nominatim) et bouton "Ma position". */
export default function MapPicker({ value, onChange, city }) {
  const { t, i18n } = useTranslation();
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const change = useRef(onChange);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => { change.current = onChange; }, [onChange]);

  const place = (lat, lng, zoom) => {
    const m = map.current;
    if (!m) return;
    if (marker.current) marker.current.setLatLng([lat, lng]);
    else {
      marker.current = L.marker([lat, lng], { icon: pin(), draggable: true }).addTo(m);
      marker.current.on("dragend", () => { const p = marker.current.getLatLng(); change.current({ latitude: +p.lat.toFixed(6), longitude: +p.lng.toFixed(6) }); });
    }
    if (zoom) m.setView([lat, lng], zoom);
  };

  useEffect(() => {
    const start = value?.latitude != null ? [value.latitude, value.longitude] : [CAMEROON_CENTER.lat, CAMEROON_CENTER.lng];
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(start, value?.latitude != null ? 14 : CAMEROON_CENTER.zoom);
    map.current = m;
    L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: 19 }).addTo(m);
    if (value?.latitude != null) place(value.latitude, value.longitude);
    m.on("click", (e) => { place(e.latlng.lat, e.latlng.lng); change.current({ latitude: +e.latlng.lat.toFixed(6), longitude: +e.latlng.lng.toFixed(6) }); setMsg(""); });
    const timer = setTimeout(() => m.invalidateSize(), 250);
    return () => { clearTimeout(timer); m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Choisir une ville recentre la carte (sans déplacer un marqueur déjà posé).
  useEffect(() => {
    const c = CITIES.find((x) => x.name === city);
    if (c && map.current && !marker.current) map.current.setView([c.lat, c.lng], 12);
  }, [city]);

  const choose = (r) => {
    const lat = +(+r.latitude).toFixed(6), lng = +(+r.longitude).toFixed(6);
    place(lat, lng, 16);
    change.current({ latitude: lat, longitude: lng });
    setResults([]);
    setMsg("");
  };

  // Recherche précise via le backend (SerpApi / Google Maps, clé secrète côté serveur) ; repli sur OpenStreetMap si indisponible.
  const search = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (query.trim().length < 3) return;
    setMsg("");
    setResults([]);
    let found = [];
    if (!MOCK) {
      try { found = await http.get(`/places/search?q=${encodeURIComponent(query.trim())}`); } catch { found = []; }
    }
    if (!found.length) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=cm&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": i18n.language } });
        found = (await res.json()).map((h) => ({ title: h.display_name.split(",")[0], address: h.display_name, latitude: h.lat, longitude: h.lon }));
      } catch { return setMsg(t("errors.network")); }
    }
    if (!found.length) return setMsg(t("map.notFound"));
    if (found.length === 1) choose(found[0]); else setResults(found);
  };

  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => { const lat = +p.coords.latitude.toFixed(6), lng = +p.coords.longitude.toFixed(6); place(lat, lng, 15); change.current({ latitude: lat, longitude: lng }); },
    () => setMsg(t("nearby.geoFailed")),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <input className="input min-w-0 flex-1 basis-full sm:basis-auto" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("map.searchPlaceholder")} aria-label={t("map.searchPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && search(e)} />
        <button type="button" onClick={search} className="btn-outline shrink-0"><FiSearch size={15} />{t("map.searchBtn")}</button>
        <button type="button" onClick={locate} className="btn-outline shrink-0" title={t("map.locateMe")} aria-label={t("map.locateMe")}><FiCrosshair size={15} /></button>
      </div>
      {results.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm" role="listbox" aria-label={t("map.results")}>
          {results.map((r, i) => (
            <li key={i}><button type="button" role="option" onClick={() => choose(r)} className="block w-full px-3 py-2.5 text-left hover:bg-surface-2">
              <span className="font-semibold">{r.title}</span><span className="block truncate text-xs text-muted">{r.address}</span>
            </button></li>
          ))}
        </ul>
      )}
      <div ref={el} className="z-0 h-64 w-full overflow-hidden rounded-xl border border-line" />
      <p className="text-xs text-muted">
        {msg || (value?.latitude != null ? `${t("map.placed")} : ${value.latitude}, ${value.longitude}` : t("map.clickToPlace"))}
      </p>
    </div>
  );
}
