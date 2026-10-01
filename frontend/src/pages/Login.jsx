import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { homeFor, useAuth } from "../context/AuthContext";
import { AuthCard, ErrorText, Field, PasswordField, SuccessText } from "../components/ui";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: state?.email || "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const goHome = useCallback((user) => {
    const from = state?.from;
    navigate(from?.pathname ? `${from.pathname}${from.search || ""}` : homeFor(user.role), { replace: true });
  }, [navigate, state]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      goHome(await login(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={<>{t("auth.noAccount")} <Link to="/inscription" className="font-semibold text-brand">{t("auth.createAccount")}</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <SuccessText>{state?.registered ? t("auth.registeredOk") : null}</SuccessText>
        {state?.needLogin && !state?.registered && <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">{t("auth.loginRequired")}</p>}
        <Field label={t("auth.email")} type="email" value={form.email} onChange={set("email")} autoComplete="email" autoFocus={!state?.email} required />
        <PasswordField label={t("auth.password")} value={form.password} onChange={set("password")} autoComplete="current-password" autoFocus={Boolean(state?.email)} required />
        <ErrorText>{error}</ErrorText>
        <button className="btn-primary w-full" disabled={busy}>{busy ? t("auth.loggingIn") : t("auth.loginBtn")}</button>
      </form>
      <GoogleButton onDone={goHome} onError={setError} />
    </AuthCard>
  );
}
