import { assetUrl } from "../api/http";
import { categoryOf } from "../utils/categories";

/** Photo de l'événement, ou un dégradé aux couleurs de sa catégorie quand il n'y a pas encore de photo. */
export default function EventImage({ event, className = "", children }) {
  const url = assetUrl(event.image);
  const cat = categoryOf(event.category);
  return (
    <div className={`relative overflow-hidden ${className}`} style={url ? undefined : { background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}>
      {url ? (
        <img src={url} alt={event.title} loading="lazy" className={`h-full w-full object-cover ${event.ended ? "grayscale" : ""}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl opacity-90 drop-shadow" aria-hidden="true">{cat.emoji}</div>
      )}
      {children}
    </div>
  );
}
