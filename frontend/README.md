# Tixora : frontend

React 19 + Vite + Tailwind 4 + react-i18next + Leaflet.

## Démarrage
```
cp .env.example .env
npm install
npm run dev
```
Avec `VITE_API_MODE=mock`, l'application fonctionne sans backend (données dans le navigateur). Comptes de démonstration du mode mock :
`admin@tixora.demo` / `Admin12345!`, `organisateur@tixora.demo` / `Demo12345!`, `client@tixora.demo` / `Demo12345!`.
Avec `VITE_API_MODE=api`, elle appelle `VITE_API_URL` selon `docs/API_CONTRACT.md`.

## Scripts
`npm run dev` · `npm run build` · `npm run lint` · `npm test` (parcours complet du backend simulé + rendu des pages)

## Structure
- `src/i18n` : dictionnaires FR/EN (une clé ajoutée en FR doit l'être en EN)
- `src/index.css` : palette et thème jour/nuit (variables CSS ; classes `bg-surface`, `text-muted`, `border-line`, `bg-brand`…)
- `src/api` : client HTTP et backend simulé
- `src/components`, `src/pages` : interface ; `public/sw.js` + `manifest.webmanifest` : PWA

## Docker
```
docker build -t tixora-frontend --build-arg VITE_API_URL=https://votre-domaine/api .
docker run -p 8081:80 tixora-frontend
```
