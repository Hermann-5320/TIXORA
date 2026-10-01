import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/** Bouton "j'aime" avec mise à jour immédiate (optimiste) ; renvoie vers la connexion si nécessaire. */
export default function LikeButton({ event, onChange, className = "", showCount = false }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ liked: event.likedByMe, count: event.likesCount });
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/connexion", { state: { from: location, needLogin: true } }); return; }
    if (busy) return;
    const previous = state;
    const liked = !state.liked;
    setState({ liked, count: state.count + (liked ? 1 : -1) });
    setBusy(true);
    try {
      const res = liked ? await http.post(`/events/${event.id}/like`) : await http.del(`/events/${event.id}/like`);
      setState({ liked: res.likedByMe, count: res.likesCount });
      onChange?.(res);
    } catch (err) {
      setState(previous);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} aria-pressed={state.liked} aria-label={state.liked ? t("card.unlike") : t("card.like")} title={state.liked ? t("card.unlike") : t("card.like")}
      className={`inline-flex items-center gap-1.5 transition active:scale-90 ${className}`}>
      {state.liked ? <FaHeart className="text-red-500" size={16} /> : <FaRegHeart size={16} />}
      {showCount && <span className="text-sm font-semibold">{state.count}</span>}
    </button>
  );
}
