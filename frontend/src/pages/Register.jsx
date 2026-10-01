import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { http } from "../api/http";
import { AuthCard, ErrorText, Field, PasswordField } from "../components/ui";
import GoogleButton from "../components/GoogleButton";
import { homeFor } from "../context/AuthContext";

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", organization: "", password: "", confirm: "" };

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "ORGANISATEUR" ? "ORGANISATEUR" : "CLIENT");
  const [form, setForm] = useState(EMPTY);
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isOrg = role === "ORGANISATEUR";
  const afterGoogle = useCallback((user) => navigate(homeFor(user.role), { replace: true }), [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError(t("auth.pwMin"));
    if (form.password !== form.confirm) return setError(t("auth.pwMismatch"));
    if (!accept) return setError(t("auth.mustAccept"));
    setBusy(true);
    setError("");
    try {
      const { confirm, ...payload } = form;
      await http.post("/auth/register", { ...payload, role });
      // Une fois inscrit, on est dirigé vers la page de connexion (email prérempli).
      navigate("/connexion", { replace: true, state: { registered: true, email: form.email.trim() } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={<>{t("auth.alreadyRegistered")} <Link to="/connexion" className="font-semibold text-brand">{t("auth.signIn")}</Link></>}
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
        {[["CLIENT", t("auth.roleClient")], ["ORGANISATEUR", t("auth.roleOrganizer")]].map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={role === value} onClick={() => setRole(value)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${role === value ? "bg-surface text-brand shadow-sm" : "text-muted"}`}>{label}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("auth.firstName")} value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required />
          <Field label={t("auth.lastName")} value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required />
        </div>
        <Field label={t("auth.email")} type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        {isOrg && (
          <>
            <Field label={t("auth.organization")} value={form.organization} onChange={set("organization")} required />
            <Field label={t("auth.phone")} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" required />
          </>
        )}
        <PasswordField label={t("auth.passwordHint")} value={form.password} onChange={set("password")} autoComplete="new-password" required />
        <PasswordField label={t("auth.confirmPassword")} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
          {t("auth.acceptTerms")}
        </label>
        <ErrorText>{error}</ErrorText>
        <button className="btn-primary w-full" disabled={busy}>{busy ? t("auth.creating") : t("auth.createBtn")}</button>
      </form>
      {!isOrg && <GoogleButton signup onDone={afterGoogle} onError={setError} />}
    </AuthCard>
  );
}
