import { useId } from "react";

/** Pastille "ticket" Tixora (dégradé orange -> rose -> violet) avec un T blanc. */
export function LogoMark({ size = 32 }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="8" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB020" /><stop offset=".5" stopColor="#F0367F" /><stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d="M12 8h40a4 4 0 0 1 4 4v10a5 5 0 0 0 0 10v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V32a5 5 0 0 0 0-10V12a4 4 0 0 1 4-4z" fill={`url(#${id})`} />
      <path d="M20 18h24a3 3 0 0 1 0 6H35v22a3 3 0 0 1-6 0V24h-9a3 3 0 0 1 0-6z" fill="#fff" />
    </svg>
  );
}

export default function Logo({ className = "", text = "text-white" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className={`text-xl font-extrabold tracking-tight ${text}`}>Tixora</span>
    </span>
  );
}
