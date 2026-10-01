import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { http } from "../api/http";
import { useToast } from "../context/ToastContext";
import { ErrorText, Field, PasswordField } from "./ui";

const EMPTY = { firstName: "", lastName: "", email: "", password: "", eventId: "" };

export default function ControllersPanel({ events }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => http.get("/controllers").then(setList), []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const active = events.filter((ev) => ev.status === "APPROVED" && !ev.ended);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await http.post("/controllers", form);
      setForm(EMPTY);
      toast.success(t("controllers.created"));
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mt-8 space-y-4">
      <h2 className="text-xl font-bold">{t("controllers.title")}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted">{t("controllers.createFirst")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("controllers.firstName")} value={form.firstName} onChange={set("firstName")} required />
            <Field label={t("controllers.lastName")} value={form.lastName} onChange={set("lastName")} required />
          </div>
          <Field label={t("controllers.loginEmail")} type="email" value={form.email} onChange={set("email")} required />
          <PasswordField label={t("controllers.password")} value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required />
          <label className="block text-sm font-medium">{t("controllers.eventToControl")}
            <select className="input mt-1" value={form.eventId} onChange={set("eventId")} required>
              <option value="">{t("controllers.choose")}</option>
              {(active.length ? active : events).map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </label>
          <ErrorText>{error}</ErrorText>
          <button className="btn-primary w-full" disabled={busy}>{busy ? t("controllers.creating") : t("controllers.create")}</button>
        </form>
      )}
      <ul className="divide-y divide-line text-sm">
        {list.map((c) => (
          <li key={c.id} className="py-2">
            <span className="font-semibold">{c.firstName} {c.lastName}</span>
            <span className="text-muted"> : {c.email}, {events.find((ev) => ev.id === c.eventId)?.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
