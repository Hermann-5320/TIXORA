import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiDownload, FiLogOut, FiMenu, FiSearch, FiWifiOff, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import useOnline from "../hooks/useOnline";
import useInstallPrompt from "../hooks/useInstallPrompt";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { Spinner } from "./ui";

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || "contact@tixora.cm";

const navCls = ({ isActive }) => `rounded-full px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();
  const { canInstall, install } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const roleLink = {
    CLIENT: ["/mes-billets", t("nav.myTickets")], ORGANISATEUR: ["/organisateur", t("nav.organizer")],
    CONTROLEUR: ["/controle", t("nav.scanner")], ADMIN: ["/admin", t("nav.admin")],
  }[user?.role];
  const canCreate = !user || user.role === "ORGANISATEUR";

  const search = (e) => {
    e.preventDefault();
    navigate(`/evenements${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
    setOpen(false);
  };
  const doLogout = () => { logout(); setOpen(false); navigate("/"); };
  const createTo = user ? "/organisateur" : "/inscription?role=ORGANISATEUR";

  const links = (
    <>
      <NavLink to="/" end className={navCls} onClick={() => setOpen(false)}>{t("nav.home")}</NavLink>
      <NavLink to="/evenements" className={navCls} onClick={() => setOpen(false)}>{t("nav.events")}</NavLink>
      <NavLink to="/pres-de-moi" className={navCls} onClick={() => setOpen(false)}>{t("nav.nearby")}</NavLink>
      {user && <NavLink to="/favoris" className={navCls} onClick={() => setOpen(false)}>{t("nav.favorites")}</NavLink>}
      {roleLink && <NavLink to={roleLink[0]} className={navCls} onClick={() => setOpen(false)}>{roleLink[1]}</NavLink>}
      {user?.role === "ORGANISATEUR" && <NavLink to="/controle" className={navCls} onClick={() => setOpen(false)}>{t("nav.scanner")}</NavLink>}
    </>
  );

  return (
    <div className="tx-safe-x flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">Skip to content</a>
      <header className="sticky top-0 z-50 bg-nav text-white shadow-lg shadow-black/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/" aria-label="Tixora" className="shrink-0"><Logo /></Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">{links}</nav>

          <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 focus-within:bg-white/15 xl:flex" role="search">
            <FiSearch className="text-white/60" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("nav.searchPlaceholder")} aria-label={t("nav.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-white placeholder-white/50 outline-none" />
          </form>

          <div className="ml-auto flex items-center gap-1 xl:ml-2">
            <LangToggle />
            <ThemeToggle />
            {canCreate && <Link to={createTo} className="btn-primary ml-1 hidden sm:inline-flex">{t("nav.createEvent")}</Link>}
            {user ? (
              <button onClick={doLogout} className="ml-1 hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white lg:flex" title={t("nav.logout")}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-xs font-bold">{(user.firstName || "?")[0].toUpperCase()}</span>
                <FiLogOut size={16} /><span className="sr-only">{t("nav.logout")}</span>
              </button>
            ) : (
              <Link to="/connexion" className="ml-1 hidden rounded-full px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white lg:inline-flex">{t("nav.login")}</Link>
            )}
            <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={t("nav.menu")} aria-expanded={open}>
              {open ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-white/10 px-4 pb-4 lg:hidden">
            <form onSubmit={search} className="my-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2" role="search">
              <FiSearch className="text-white/60" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("nav.searchPlaceholder")} aria-label={t("nav.searchPlaceholder")} className="w-full bg-transparent text-sm text-white placeholder-white/50 outline-none" />
            </form>
            <nav className="flex flex-col gap-1" aria-label="Mobile">{links}</nav>
            <div className="mt-3 flex flex-wrap gap-2">
              {canCreate && <Link to={createTo} onClick={() => setOpen(false)} className="btn-primary">{t("nav.createEvent")}</Link>}
              {user ? <button onClick={doLogout} className="btn-outline !bg-transparent !text-white !border-white/25">{t("nav.logout")}</button> : (
                <>
                  <Link to="/connexion" onClick={() => setOpen(false)} className="btn-outline !bg-transparent !text-white !border-white/25">{t("nav.login")}</Link>
                  <Link to="/inscription" onClick={() => setOpen(false)} className="btn-outline !bg-transparent !text-white !border-white/25">{t("nav.register")}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black">
          <FiWifiOff size={16} /> {t("common.offline")}
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
        <Suspense fallback={<Spinner />}><Outlet key={location.pathname} /></Suspense>
      </main>

      <footer className="bg-nav text-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm">{t("footer.tagline")}</p>
            {canInstall && <button onClick={install} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"><FiDownload size={15} />{t("common.installApp")}</button>}
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-white">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/">{t("nav.home")}</Link></li>
              <li><Link className="hover:text-white" to="/evenements">{t("nav.events")}</Link></li>
              <li><Link className="hover:text-white" to="/pres-de-moi">{t("nav.nearby")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-white">{t("footer.organizers")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to={createTo}>{t("nav.createEvent")}</Link></li>
              <li><Link className="hover:text-white" to="/connexion">{t("nav.login")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-white">{t("footer.help")}</h3>
            <p className="text-sm"><a className="hover:text-white" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Tixora. {t("footer.rights")}</div>
      </footer>
    </div>
  );
}
