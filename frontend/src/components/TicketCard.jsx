import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { assetUrl } from "../api/http";
import { fmtDate, fmtPrice } from "../utils/format";
import { readableOn, shade } from "../utils/color";
import { TEMPLATES } from "../utils/templates";


/**
 * Billet personnalisé : 4 gabarits (CLASSIC, MODERN, FESTIVAL, MINIMAL), couleur, message et logo de l'organisateur.
 * `ticket` : { eventTitle, startsAt, venue, city, categoryName, price, status, code, organizerName, design }.
 */
export default function TicketCard({ ticket, dim = false, size = 120, children }) {
  const { t } = useTranslation();
  const d = ticket.design || {};
  const color = d.color || "#f24e12";
  const template = TEMPLATES.includes(d.template) ? d.template : "CLASSIC";
  const logo = assetUrl(d.logo);
  const valid = ticket.status === "VALID";
  const place = [ticket.venue, ticket.city].filter(Boolean).join(", ");
  const onColor = readableOn(color);
  const qr = (
    <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
      <QRCodeSVG value={ticket.code} size={size} className={valid ? "" : "opacity-25"} />
    </div>
  );
  const status = (
    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ background: valid ? "#16a34a" : "#64748b", color: "#fff" }}>{valid ? t("tickets.valid") : t("tickets.used")}</span>
  );
  const logoEl = (className = "h-9") => (logo ? <img src={logo} alt={ticket.organizerName || ""} className={`${className} max-w-[120px] object-contain`} /> : null);

  const info = () => (
    <div className="min-w-0 space-y-1">
      <p className="text-xs opacity-80">{fmtDate(ticket.startsAt)}</p>
      <p className="truncate text-xs opacity-80">{place}</p>
      <p className="text-sm font-semibold">{ticket.categoryName} · {fmtPrice(ticket.price)}</p>
    </div>
  );
  const message = d.message ? <p className="mt-3 rounded-lg px-3 py-2 text-xs italic" style={{ background: "rgba(127,127,127,.12)" }}>{d.message}</p> : null;
  const footer = <p className="mt-3 text-center text-[10px] uppercase tracking-widest opacity-60 sm:text-left">{t("tickets.showQr")}</p>;

  let body;
  if (template === "MODERN") {
    body = (
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-fg sm:flex-row">
        <div className="flex items-center gap-3 p-4 sm:w-40 sm:flex-col sm:justify-between sm:py-5"
          style={{ background: `linear-gradient(160deg, ${color}, ${shade(color, -0.35)})`, color: onColor }}>
          {logoEl("h-10")}
          <span className="text-xs font-bold uppercase tracking-widest opacity-90">{ticket.organizerName || "Tixora"}</span>
          {status}
        </div>
        <div className="flex flex-1 flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold leading-tight">{ticket.eventTitle}</h3>
            <div className="mt-2">{info()}</div>
            {message}
          </div>
          <div className="text-center">{qr}{footer}</div>
        </div>
      </div>
    );
  } else if (template === "FESTIVAL") {
    const bg = `radial-gradient(circle at 15% 10%, ${shade(color, 0.25)}, transparent 55%), linear-gradient(135deg, ${color}, ${shade(color, -0.55)})`;
    body = (
      <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: bg }}>
        <div className="flex items-start justify-between gap-3">{logoEl("h-11")}{status}</div>
        <h3 className="mt-3 text-2xl font-black uppercase leading-none tracking-tight drop-shadow sm:text-3xl">{ticket.eventTitle}</h3>
        <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 self-stretch">
            <p className="text-sm font-semibold">{fmtDate(ticket.startsAt)}</p>
            <p className="text-sm opacity-90">{place}</p>
            <p className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{ticket.categoryName} · {fmtPrice(ticket.price)}</p>
            {d.message && <p className="mt-3 text-sm font-medium italic opacity-95">{d.message}</p>}
          </div>
          <div className="text-center">{qr}<p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">{t("tickets.showQr")}</p></div>
        </div>
      </div>
    );
  } else if (template === "MINIMAL") {
    body = (
      <div className="overflow-hidden rounded-2xl border bg-surface p-5 text-fg" style={{ borderColor: color, borderTopWidth: 4 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{ticket.categoryName}</p>
            <h3 className="mt-1 text-xl font-bold leading-tight">{ticket.eventTitle}</h3>
          </div>
          {logoEl("h-9")}
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 self-stretch">{info()}{message}<div className="mt-2">{status}</div></div>
          <div className="text-center">{qr}{footer}</div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface text-fg">
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: color, color: onColor }}>
          <div className="flex min-w-0 items-center gap-3">{logoEl("h-9")}<span className="truncate text-sm font-bold">{ticket.organizerName || "Tixora"}</span></div>
          {status}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="min-w-0 flex-1 self-stretch">
            <h3 className="text-lg font-extrabold leading-tight">{ticket.eventTitle}</h3>
            <div className="mt-2">{info()}</div>
            {message}
          </div>
          <div className="text-center">{qr}{footer}</div>
        </div>
      </div>
    );
  }

  return (
    <article className={dim ? "opacity-70" : ""}>
      {body}
      {children}
    </article>
  );
}
