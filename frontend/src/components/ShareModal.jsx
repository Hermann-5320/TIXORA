import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiCopy, FiLink, FiMapPin, FiShare2 } from "react-icons/fi";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Modal } from "./ui";
import EventImage from "./EventImage";
import { useToast } from "../context/ToastContext";
import { shareUrl } from "../utils/share";
import { fmtDate } from "../utils/format";

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export default function ShareModal({ event, open, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const url = shareUrl(event);
  const place = [event.venue, event.city].filter(Boolean).join(", ");
  const text = t("share.textWithDate", { title: event.title, date: fmtDate(event.startsAt), place });
  const enc = encodeURIComponent;

  const doCopy = async (value) => {
    if (await copy(value)) { setCopied(true); toast.success(t("share.copied")); setTimeout(() => setCopied(false), 2000); }
  };
  const nativeShare = () => navigator.share({ title: event.title, text, url }).catch(() => {});

  const btn = "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90";
  return (
    <Modal open={open} onClose={onClose} title={t("share.title")} subtitle={t("share.subtitle")}>
      <div className="overflow-hidden rounded-xl border border-line">
        <EventImage event={event} className="aspect-[16/7]" />
        <div className="space-y-1 p-3 text-sm">
          <p className="font-bold">{event.title}</p>
          <p className="flex items-center gap-1.5 text-muted"><FiCalendar size={14} />{fmtDate(event.startsAt)}</p>
          <p className="flex items-center gap-1.5 text-muted"><FiMapPin size={14} />{place}</p>
        </div>
      </div>

      <p className="mb-1.5 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><FiLink size={13} />{t("share.directLink")}</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="input !font-mono !text-xs" aria-label={t("share.directLink")} />
        <button onClick={() => doCopy(url)} className="btn-primary shrink-0"><FiCopy size={15} />{copied ? "✓" : t("share.copy")}</button>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{t("share.instantly")}</p>
      <div className="grid grid-cols-2 gap-2">
        <a className={`${btn} bg-[#25D366]`} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${enc(`${text}\n${url}`)}`}><FaWhatsapp size={17} />{t("share.whatsapp")}</a>
        <a className={`${btn} bg-[#1877F2]`} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}><FaFacebookF size={15} />{t("share.facebook")}</a>
        <a className={`${btn} bg-black`} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`}><FaXTwitter size={15} />{t("share.x")}</a>
        <button className={`${btn} !bg-surface-2 !text-fg`} onClick={() => doCopy(`${text}\n${url}`)}><FiCopy size={15} />{t("share.copyAll")}</button>
        {typeof navigator.share === "function" && <button className={`${btn} col-span-2 bg-accent`} onClick={nativeShare}><FiShare2 size={15} />{t("share.native")}</button>}
      </div>
    </Modal>
  );
}
