import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiEdit2, FiImage, FiLock, FiTrash2 } from "react-icons/fi";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ControllersPanel from "../components/ControllersPanel";
import EventForm from "../components/EventForm";
import { EmptyState, ErrorText, Skeleton, StatusBadge } from "../components/ui";
import { fmtDate, fmtPrice } from "../utils/format";
import { resizeLogo, ACCEPTED } from "../utils/image";
import { logoUrl } from "../utils/logo";

function StatCard({ label, value, tone = "" }) {
  return (
    <div className="card !p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

/** Logo imprimé sur tous les billets de l'organisateur. */
function LogoCard({ user, onChanged }) {
  const { t } = useTranslation();
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const url = logoUrl(user);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await http.upload("/organizer/logo", await resizeLogo(file));
      await onChanged();
      toast.success(t("ticketDesign.logoSaved"));
    } catch (err) { toast.error(err.message === "format" ? t("image.invalid") : err.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await http.del("/organizer/logo"); await onChanged(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="card mb-6 flex flex-wrap items-center gap-4">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 text-muted">
        {url ? <img src={url} alt="" className="max-h-full max-w-full object-contain p-1" /> : <FiImage size={26} />}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold">{t("ticketDesign.logoTitle")}</h2>
        <p className="text-sm text-muted">{t("ticketDesign.logoHelp")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" onClick={() => input.current.click()} disabled={busy}>{busy ? t("image.processing") : url ? t("image.change") : t("image.choose")}</button>
          {url && <button className="btn-outline btn-sm" onClick={remove} disabled={busy}><FiTrash2 size={13} />{t("image.remove")}</button>}
        </div>
      </div>
      <input ref={input} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={pick} />
    </section>
  );
}

export default function Organizer() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [mine, setMine] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null); // null = création, sinon l'événement modifié
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => Promise.all([http.get("/events/mine").then(setMine), http.get("/organizer/stats").then(setStats)]), []);
  useEffect(() => { refresh().catch((e) => { setError(e.message); setMine([]); }); }, [refresh]);

  const reset = () => { setEditing(null); setFormKey((k) => k + 1); setError(""); };

  const submit = async (payload, image) => {
    setBusy(true);
    setError("");
    try {
      const saved = editing ? await http.put(`/events/${editing.id}`, payload) : await http.post("/events", payload);
      if (image) await http.upload(`/events/${saved.id}/image`, image);
      toast.success(editing ? t("organizer.updatedOk") : t("organizer.submittedOk"));
      reset();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (ev) => { setEditing(ev); setFormKey((k) => k + 1); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const statOf = (id) => stats?.events.find((e) => e.eventId === id);

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t("orgStats.title")}>
        {stats === null ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />) : (
          <>
            <StatCard label={t("orgStats.total")} value={fmtPrice(stats.revenue)} />
            <StatCard label={t("orgStats.commission", { percent: stats.commissionPercent })} value={`- ${fmtPrice(stats.commission)}`} tone="text-muted" />
            <StatCard label={t("orgStats.net")} value={fmtPrice(stats.net)} tone="text-green-600 dark:text-green-400" />
            <StatCard label={t("orgStats.tickets")} value={stats.ticketsSold} />
          </>
        )}
      </section>

      <LogoCard user={user} onChanged={refreshUser} />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card h-fit">
          <h1 className="mb-1 text-xl font-bold">{editing ? t("organizer.editEvent") : t("organizer.newEvent")}</h1>
          {editing?.status === "REJECTED" && <p className="mb-3 text-xs text-muted">{t("organizer.resubmitInfo")}</p>}
          <div className="mt-4">
            <EventForm key={formKey} initial={editing} onSubmit={submit} onCancel={editing ? reset : null} busy={busy} error={error}
              logo={logoUrl(user)} submitLabel={editing ? t("organizer.saveChanges") : t("organizer.submit")} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">{t("organizer.myEvents")}</h2>
          {mine === null && <Skeleton className="h-32" />}
          {mine?.length === 0 && <EmptyState icon="🗓️" title={t("organizer.noEvents")} />}
          <ErrorText>{mine?.length === 0 ? error : ""}</ErrorText>
          <div className="space-y-4">
            {mine?.map((ev) => {
              const st = statOf(ev.id);
              return (
                <article key={ev.id} className="card !p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold"><Link to={`/evenements/${ev.id}`} className="hover:text-brand">{ev.title}</Link></h3>
                      <p className="text-sm text-muted">{fmtDate(ev.startsAt)} - {ev.venue}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={ev.status}>{t(`organizer.status.${ev.status}`)}</StatusBadge>
                      {ev.ended && <span className="badge bg-surface-2 text-muted"><FiLock className="mr-1" size={11} />{t("organizer.locked")}</span>}
                    </div>
                  </div>
                  {ev.status === "REJECTED" && ev.rejectionReason && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{t("organizer.rejectedReason", { reason: ev.rejectionReason })}</p>}
                  <ul className="mt-3 space-y-1 text-sm">
                    {ev.ticketTypes.map((c) => {
                      const ts = st?.types.find((x) => x.name === c.name);
                      return (
                        <li key={c.id} className="flex flex-wrap justify-between gap-x-3 text-muted">
                          <span>{c.name} : {ts?.sold || 0}/{c.capacity} {t("orgStats.sold")}</span>
                          <span className="font-medium text-fg">{fmtPrice(ts?.revenue || 0)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-bold"><span>{t("orgStats.eventTotal")}</span><span>{fmtPrice(st?.revenue || 0)}</span></p>
                  <div className="mt-3 flex items-center gap-3">
                    <button className="btn-outline btn-sm" onClick={() => edit(ev)} disabled={ev.ended}><FiEdit2 size={13} />{t("common.edit")}</button>
                    {ev.ended && <span className="text-xs text-muted">{t("organizer.lockedHint")}</span>}
                  </div>
                </article>
              );
            })}
          </div>
          <ControllersPanel events={mine || []} />
        </section>
      </div>
    </>
  );
}
