import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <p className="bg-gradient-to-r from-amber-400 via-pink-500 to-violet-600 bg-clip-text text-7xl font-black text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-muted">{t("notFound.text")}</p>
      <Link to="/" className="btn-primary mt-6">{t("notFound.back")}</Link>
    </div>
  );
}
