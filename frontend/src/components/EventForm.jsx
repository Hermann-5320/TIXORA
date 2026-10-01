import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorText, Field } from "./ui";
import ImageInput from "./ImageInput";
import { CATEGORIES, CITIES } from "../utils/categories";
import { toInputDate } from "../utils/format";
import { assetUrl } from "../api/http";
import TicketCard from "./TicketCard";
import { TEMPLATES } from "../utils/templates";
import { isHex } from "../utils/color";

const MapPicker = lazy(() => import("./MapPicker"));
const newType = () => ({ name: "", price: "", capacity: "" });

/**
 * Formulaire d'événement partagé : création et modification par l'organisateur, correction par l'administrateur.
 * Les types de billets ne se saisissent qu'à la création.
 */
export default function EventForm({ initial, onSubmit, onCancel, busy, error, submitLabel, logo }) {
  const { t } = useTranslation();
  const editing = Boolean(initial);
  const [f, setF] = useState({
    title: initial?.title || "", category: initial?.category || "MUSIQUE", city: initial?.city || "", venue: initial?.venue || "",
    startsAt: toInputDate(initial?.startsAt), endsAt: toInputDate(initial?.endsAt), description: initial?.description || "",
    latitude: initial?.latitude ?? null, longitude: initial?.longitude ?? null,
    ticketTemplate: initial?.ticketTemplate || "CLASSIC", ticketColor: initial?.ticketColor || "#f24e12", ticketMessage: initial?.ticketMessage || "",
  });
  const [types, setTypes] = useState([newType()]);
  const [image, setImage] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setType = (i, k) => (e) => setTypes((l) => l.map((x, idx) => (idx === i ? { ...x, [k]: e.target.value } : x)));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      title: f.title, category: f.category, city: f.city || null, venue: f.venue, startsAt: f.startsAt, endsAt: f.endsAt || null,
      description: f.description, latitude: f.latitude, longitude: f.longitude,
      ticketTemplate: f.ticketTemplate, ticketColor: isHex(f.ticketColor) ? f.ticketColor : "#f24e12", ticketMessage: f.ticketMessage.trim() || null,
    };
    if (!editing) payload.ticketTypes = types.map((x) => ({ name: x.name, price: Number(x.price), capacity: Number(x.capacity) }));
    onSubmit(payload, image);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t("organizer.title")} value={f.title} onChange={set("title")} maxLength={150} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">{t("organizer.category")}
          <select className="input mt-1" value={f.category} onChange={set("category")}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {t(`categories.${c.id}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">{t("organizer.city")}
          <select className="input mt-1" value={f.city} onChange={set("city")}>
            <option value="">{t("organizer.pickCity")}</option>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            {f.city && !CITIES.some((c) => c.name === f.city) && <option value={f.city}>{f.city}</option>}
          </select>
        </label>
      </div>
      <Field label={t("organizer.venue")} value={f.venue} onChange={set("venue")} maxLength={200} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("organizer.startsAt")} type="datetime-local" value={f.startsAt} onChange={set("startsAt")} required />
        <Field label={t("organizer.endsAt")} type="datetime-local" value={f.endsAt} onChange={set("endsAt")} min={f.startsAt} />
      </div>
      <p className="-mt-2 text-xs text-muted">{t("organizer.endsAtHint")}</p>
      <label className="block text-sm font-medium">{t("organizer.description")}
        <textarea className="input mt-1" rows={4} maxLength={2000} value={f.description} onChange={set("description")} />
      </label>

      <ImageInput label={t("organizer.photo")} currentUrl={assetUrl(initial?.image)} onChange={setImage} />

      <div>
        <h3 className="text-sm font-semibold">{t("organizer.locationTitle")}</h3>
        <p className="mb-2 text-xs text-muted">{t("organizer.locationHint")}</p>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-2" />}>
          <MapPicker value={{ latitude: f.latitude, longitude: f.longitude }} city={f.city} onChange={(p) => setF((s) => ({ ...s, ...p }))} />
        </Suspense>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">{t("ticketDesign.title")}</legend>
        <p className="text-xs text-muted">{t("ticketDesign.hint")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t("ticketDesign.template")}>
          {TEMPLATES.map((tp) => (
            <button key={tp} type="button" role="radio" aria-checked={f.ticketTemplate === tp} onClick={() => setF((s) => ({ ...s, ticketTemplate: tp }))}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${f.ticketTemplate === tp ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-brand"}`}>
              {t(`ticketDesign.templates.${tp}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">{t("ticketDesign.color")}
            <input type="color" value={isHex(f.ticketColor) ? f.ticketColor : "#f24e12"} onChange={set("ticketColor")} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1" />
          </label>
          {["#f24e12", "#e11d74", "#7c3aed", "#2563eb", "#0f766e", "#16a34a", "#f59e0b", "#0f172a"].map((c) => (
            <button key={c} type="button" onClick={() => setF((s) => ({ ...s, ticketColor: c }))} aria-label={c}
              className={`h-8 w-8 rounded-full border-2 ${f.ticketColor === c ? "border-fg" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
        <label className="block text-sm font-medium">{t("ticketDesign.message")}
          <input className="input mt-1" value={f.ticketMessage} onChange={set("ticketMessage")} maxLength={140} placeholder={t("ticketDesign.messagePlaceholder")} />
        </label>
        <p className="text-xs text-muted">{logo ? t("ticketDesign.logoUsed") : t("ticketDesign.noLogo")}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("ticketDesign.preview")}</p>
        <TicketCard size={84} ticket={{
          eventTitle: f.title || t("ticketDesign.sampleTitle"), startsAt: f.startsAt || new Date().toISOString(), venue: f.venue || t("ticketDesign.sampleVenue"), city: f.city,
          categoryName: types[0]?.name || "VIP", price: Number(types[0]?.price) || 5000, status: "VALID", code: "PREVIEW-0000.0000", organizerName: initial?.organizerName,
          design: { template: f.ticketTemplate, color: f.ticketColor, message: f.ticketMessage, logo },
        }} />
      </fieldset>

      {editing ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">{t("organizer.typesReadonly")}</p>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("organizer.ticketTypes")}</h3>
          {types.map((x, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input className="input col-span-2 sm:col-span-1" placeholder={t("organizer.typeName")} value={x.name} onChange={setType(i, "name")} aria-label={t("organizer.typeName")} maxLength={60} required />
              <input className="input" type="number" min="0" placeholder={t("organizer.typePrice")} value={x.price} onChange={setType(i, "price")} aria-label={t("organizer.typePrice")} required />
              <input className="input" type="number" min="1" placeholder={t("organizer.typeCapacity")} value={x.capacity} onChange={setType(i, "capacity")} aria-label={t("organizer.typeCapacity")} required />
              <button type="button" className="btn-outline btn-sm" disabled={types.length === 1} onClick={() => setTypes((l) => l.filter((_, idx) => idx !== i))} aria-label={t("organizer.removeType")}>✕</button>
            </div>
          ))}
          {types.length < 10 && <button type="button" className="btn-outline btn-sm" onClick={() => setTypes((l) => [...l, newType()])}>+ {t("organizer.addType")}</button>}
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={busy}>{busy ? t("organizer.submitting") : submitLabel}</button>
        {onCancel && <button type="button" className="btn-outline" onClick={onCancel} disabled={busy}>{t("common.cancel")}</button>}
      </div>
    </form>
  );
}
