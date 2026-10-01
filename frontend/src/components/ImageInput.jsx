import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiImage } from "react-icons/fi";
import { ACCEPTED, resizeImage } from "../utils/image";

/** Choix d'une photo : redimensionnée dans le navigateur, l'appelant reçoit un Blob JPEG prêt à envoyer (ou null). */
export default function ImageInput({ label, currentUrl, onChange }) {
  const { t } = useTranslation();
  const input = useRef(null);
  const [preview, setPreview] = useState(currentUrl || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } catch {
      setError(t("image.invalid"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="block text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 text-muted">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <FiImage size={28} />}
        </div>
        <div className="space-y-1">
          <button type="button" className="btn-outline btn-sm" onClick={() => input.current.click()} disabled={busy}>
            {busy ? t("image.processing") : preview ? t("image.change") : t("image.choose")}
          </button>
          <p className="text-xs text-muted">{t("image.hint")}</p>
          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={pick} />
    </div>
  );
}
