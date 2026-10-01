import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Html5QrcodeScanner } from "html5-qrcode";
import { http } from "../api/http";
import { ErrorText } from "../components/ui";

const STYLES = {
  VALID: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
  ALREADY_USED: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  INVALID: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
  EVENT_ENDED: "bg-surface-2 text-muted border-line",
};

export default function Scanner() {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const lastCode = useRef("");

  const check = useCallback(async (code) => {
    if (!code || code === lastCode.current) return;
    lastCode.current = code;
    setTimeout(() => { lastCode.current = ""; }, 3000);
    setError("");
    try {
      const res = await http.post("/tickets/scan", { code });
      setResult(res);
      setHistory((h) => [{ ...res, at: new Date().toLocaleTimeString(i18n.language === "en" ? "en-GB" : "fr-FR") }, ...h].slice(0, 30));
    } catch (err) {
      setError(err.message);
    }
  }, [i18n.language]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 240 }, false);
    scanner.render(check, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [check]);

  const label = (r) => t(`scanner.results.${r}`);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-extrabold">{t("scanner.title")}</h1>
      <div id="reader" className="overflow-hidden rounded-2xl bg-white text-slate-900" />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); check(manual.trim()); setManual(""); }}>
        <input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("scanner.manual")} aria-label={t("scanner.manual")} />
        <button className="btn-outline shrink-0">{t("scanner.verify")}</button>
      </form>
      <ErrorText>{error}</ErrorText>
      {result && (
        <div role="status" className={`rounded-2xl border p-4 ${STYLES[result.result]}`}>
          <p className="text-lg font-bold">{label(result.result)}</p>
          {result.ticket && <p className="text-sm">{t("scanner.ticketInfo", { event: result.ticket.eventTitle, category: result.ticket.categoryName })}</p>}
        </div>
      )}
      <section>
        <h2 className="mb-2 font-semibold">{t("scanner.history")}</h2>
        {history.length === 0 && <p className="text-sm text-muted">{t("scanner.none")}</p>}
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
          {history.map((h, i) => <li key={i} className="flex justify-between px-4 py-2"><span>{label(h.result)}</span><span className="text-muted">{h.at}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
