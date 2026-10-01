import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { CAMEROON_CENTER } from "../utils/categories";
import { TILES } from "../utils/map";
import { fmtDate } from "../utils/format";

const pin = () => L.divIcon({ className: "tx-pin", html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26] });
const meIcon = () => L.divIcon({ className: "tx-me", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] });

/** Popup construit en DOM (textContent) : aucun texte d'événement n'est interprété comme du HTML. */
function popup(ev, t, onOpen) {
  const box = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = ev.title;
  const meta = document.createElement("div");
  meta.style.cssText = "margin:4px 0 8px;font-size:12px;color:#475569";
  meta.textContent = `${fmtDate(ev.startsAt)}${ev.distanceKm != null ? ` · ${t("nearby.away", { km: ev.distanceKm })}` : ""}`;
  const btn = document.createElement("button");
  btn.textContent = t("common.view");
  btn.style.cssText = "background:#f24e12;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer";
  btn.onclick = () => onOpen(ev);
  box.append(title, meta, btn);
  return box;
}

export default function EventsMap({ events, me, radiusKm, onOpen, className = "h-[420px]" }) {
  const { t } = useTranslation();
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([CAMEROON_CENTER.lat, CAMEROON_CENTER.lng], CAMEROON_CENTER.zoom);
    L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: 19 }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const bounds = [];
    events.filter((e) => e.latitude != null).forEach((e) => {
      L.marker([e.latitude, e.longitude], { icon: pin(), title: e.title }).bindPopup(popup(e, t, onOpen)).addTo(layer.current);
      bounds.push([e.latitude, e.longitude]);
    });
    if (me) {
      L.marker([me.lat, me.lng], { icon: meIcon(), title: t("nearby.you"), zIndexOffset: 1000 }).bindTooltip(t("nearby.you")).addTo(layer.current);
      const circle = L.circle([me.lat, me.lng], { radius: radiusKm * 1000, color: "#f24e12", weight: 1, fillOpacity: 0.06 }).addTo(layer.current);
      m.fitBounds(circle.getBounds(), { padding: [20, 20] });
    } else if (bounds.length) {
      m.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
  }, [events, me, radiusKm, t, onOpen]);

  return <div ref={el} className={`z-0 w-full overflow-hidden rounded-2xl border border-line ${className}`} role="application" aria-label="Map" />;
}
