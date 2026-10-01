# Tixora

Billetterie en ligne avec QR codes. Monolithe Spring Boot 3 (Java 21) + PostgreSQL + frontend React (PWA).

## Lancer tout le projet (Docker)
```
./setup.sh                 # crée .env avec des secrets aléatoires et affiche le mot de passe admin
docker compose up --build
```
Frontend : http://localhost:8081 · API : http://localhost:8082/api (port 8082 sur l'hôte, 8080 dans le conteneur)

Comptes créés au démarrage (`SEED_DEMO=true` dans `.env`, base vide) :
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | valeur de `ADMIN_EMAIL` | valeur de `ADMIN_PASSWORD` |
| Organisateur | organisateur@tixora.demo | Demo12345! |
| Client | client@tixora.demo | Demo12345! |

En production : `SEED_DEMO=false`, un `ADMIN_PASSWORD` fort, `JWT_SECRET` d'au moins 48 caractères.

## Lancer en développement
- Base : `docker compose up db` (ajoutez `ports: ["5432:5432"]` à `db` pour un accès local)
- API : exporter `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (et au besoin `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_DEMO=true`) puis `cd backend && mvn spring-boot:run`
- Frontend : `cd frontend`, `.env` avec `VITE_API_MODE=api` et `VITE_API_URL=http://localhost:8080/api` (ou `8082` si l'API tourne via Docker), puis `npm install && npm run dev`

## Fonctionnalités
- **Accueil et navigation** : hero avec recherche, tendances, événements vedettes, filtres (catégorie, ville), mode jour/nuit, français/anglais, PWA installable.
- **Événements** : cartes avec photo, date, catégorie, j'aime, partage (WhatsApp, Facebook, X, lien copiable, partage natif mobile, aperçu avec image), page Favoris.
- **Près de moi** : carte OpenStreetMap, bouton « Me localiser », rayon réglable, distances (distance de Haversine côté serveur).
- **Parcours** : inscription → page de connexion ; retour à la page d'origine après connexion.
- **Organisateur** : création/modification d'événements (photo, position sur la carte, types de billets), soumission à validation, contrôleurs, scan des billets.
- **Verrouillage** : un événement terminé n'est plus vendable, modifiable ni contrôlable ; l'admin peut le corriger.
- **Administration** (`/admin`) : validation/refus (avec motif) des événements, correction, blocage/déblocage et suppression des comptes.
- **Client** : billets personnalisés avec QR code, téléchargement PDF aux couleurs de l'organisateur, disponibles hors ligne (stockés sur l'appareil, effacés à la déconnexion). Connexion possible avec Google (comptes clients).
- **Paiement Mobile Money (CT Pay)** : le client choisit son opérateur, saisit son numéro, valide avec son code PIN ; les billets sont émis uniquement après confirmation du paiement. CT Pay ajoute ses frais au montant (constaté : 100 FCFA envoyés → client débité 105, marchand crédité 100) : le client les supporte, l'organisateur reçoit le prix affiché.
- **Billets personnalisés** : l'organisateur choisit pour chaque événement un gabarit (Classique, Moderne, Festival, Minimal), une couleur et un message ; son logo (un seul, dans son espace) apparaît sur tous ses billets.
- **Ventes de l'organisateur** : total des ventes, commission Tixora (10 %), net à recevoir, détail par événement et par type de billet.
- **Reversements (admin)** : onglet « Paiements » avec, par organisateur, ventes − commission = montant à virer, et la liste des paiements échoués ou à rembourser.
- **Téléphones et tablettes** : interface pensée pour les écrans tactiles (zones de toucher de 44 px, champs sans zoom automatique, zones sûres des écrans à encoche).

## Choix techniques
- JWT stateless ; rôles CLIENT / ORGANISATEUR / CONTROLEUR / ADMIN ; mots de passe hashés (BCrypt). Le compte est relu en base à chaque requête : blocage et changement de rôle sont immédiats.
- QR code = identifiant aléatoire + signature HMAC (infalsifiable). Validation atomique en base. Stock protégé par verrou pessimiste (pas de survente).
- **Photos stockées dans PostgreSQL** (`bytea`) : aucun compte externe, elles survivent aux redéploiements (les disques de Render sont éphémères) et sont sauvegardées avec la base. Redimensionnées dans le navigateur (1280 px max), format vérifié par signature côté serveur, cache navigateur longue durée. À grande échelle, migrer vers un stockage objet (S3, Supabase Storage) en changeant `EventService.saveImage` et `EventController.image`.
- **Schéma géré par Flyway** (`backend/src/main/resources/db/migration`). Une base créée par l'ancienne version (`ddl-auto: update`) est reconnue automatiquement et migrée par `V2` (les événements existants restent publiés).
- **Paiement CT Pay** (`backend/.../payment`) : deux modes via `CTPAY_MODE`. `simulate` (défaut) : aucun appel réseau ni débit, le paiement réussit après 4 s (échec si le numéro finit par `00`). `live` : appels réels à CT Pay (exige `CTPAY_TOKEN`). Les places sont réservées à la commande (10 min, `ORDER_TTL_MINUTES`), les billets émis après `SUCCESS`, les places libérées en cas d'échec ou d'expiration. Le callback CT Pay n'étant pas signé, il sert seulement de déclencheur : l'état réel est toujours revérifié auprès de CT Pay (le front interroge aussi le serveur toutes les 3 s, le callback n'est donc pas indispensable). Un paiement reçu après expiration, sans place disponible, passe en `REFUND_NEEDED` (visible dans l'admin).
- **Frais et commission** : le backend envoie à CT Pay le prix exact des billets ; CT Pay ajoute ses frais (`CTPAY_FEE_PERCENT`, ≈ 4,78 % constaté (100 → 105, 1 000 → 1 048, 5 000 → 5 239)) et le client paie prix + frais. L'affichage avant paiement est une estimation, remplacée par les montants réels renvoyés par CT Pay. La commission Tixora (`COMMISSION_PERCENT`, 10 %) est calculée sur le prix des billets et reversée manuellement par l'admin.
- **Statuts CT Pay** : `SUCCESSFUL` (ou `SUCCESS`) = payé ; `FAILED`, `ERROR`, `CANCELLED`... = échec ; tout autre statut reste en attente (jamais de libération de places sur un statut inconnu).
- **Opérateurs** : `CTPAY_OPERATORS` (défaut `MOMO,OM`) liste ceux proposés, car CT Pay les marque `CREATE_BUT_NOT_ACTIVE` tout en les acceptant.
- **Secrets** : `CTPAY_TOKEN` et `SERPAPI_KEY` ne sont lus que par le backend (variables d'environnement). Ils ne figurent dans aucun fichier source ni dans le frontend. Le fichier `.env` n'est pas versionné : ne le partagez pas et ne le commitez pas.
- Aperçu de partage : `/api/share/events/{id}` sert les balises Open Graph aux robots puis redirige vers l'application. Renseigner `APP_PUBLIC_URL` (URL du frontend) quand front et API sont sur des domaines différents.

## Activer le paiement réel CT Pay
1. Tester d'abord avec Postman sur votre compte marchand (token dans l'en-tête `Token`) : `GET /ct-payment/api/operator/getAll`, puis `POST /ct-payment/payments/pay/withPhone`, puis `GET /ct-payment/api/processes/{processCode}`.
2. Dans `.env` : `CTPAY_MODE=live` (le `CTPAY_TOKEN` doit être renseigné), puis `docker compose up -d --build`.
3. En production, renseigner `API_PUBLIC_URL` avec l'URL HTTPS publique de l'API : elle sert de callback (`/api/payments/ctpay/callback`). Sans elle, les paiements fonctionnent quand même (vérification par interrogation).
4. Si CT Pay change un chemin, ils sont regroupés en haut de `CtPayGateway.java`.

## Connexion avec Google (gratuit, 5 minutes)
1. Ouvrir <https://console.cloud.google.com/> → créer un projet → « API et services » → « Écran de consentement OAuth » (type Externe, nom de l'app, votre e-mail).
2. « Identifiants » → « Créer des identifiants » → « ID client OAuth » → type **Application Web**.
3. Dans « Origines JavaScript autorisées » : `http://localhost:8081` et l'URL Vercel du front (pas de secret client à utiliser).
4. Copier l'**ID client** (`xxxx.apps.googleusercontent.com`) dans `GOOGLE_CLIENT_ID` (`.env` ou variable Render) et redémarrer l'API. Tant qu'il est vide, le bouton Google est masqué.

## Recherche précise des lieux (SerpApi)
La carte de l'organisateur interroge `/api/places/search` (Google Maps via SerpApi, clé `SERPAPI_KEY` côté serveur, réponses mises en cache 24 h, 40 recherches par heure et par utilisateur). Sans clé ou en cas d'erreur, le front se rabat sur OpenStreetMap.

## Déploiement (Render + Vercel)
**Base PostgreSQL** : ne pas utiliser la base gratuite de Render pour de vrais billets (elle expire 30 jours après sa création). Utiliser une base sans expiration (Neon, Supabase, ou Postgres payant de Render). `DB_URL` doit être au format JDBC : `jdbc:postgresql://HOTE:5432/NOM?sslmode=require`, avec `DB_USER` et `DB_PASSWORD` séparés.

**API (Render, Web Service Docker, dossier racine `backend`)**, variables : `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (48+ caractères), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (fort), `SEED_DEMO=false`, `CORS_ORIGINS` et `APP_PUBLIC_URL` (URL Vercel du front), `API_PUBLIC_URL` (URL Render de l'API), `CTPAY_MODE=live`, `CTPAY_TOKEN`, `CTPAY_OPERATORS=MOMO,OM`, `COMMISSION_PERCENT=10`, `CTPAY_FEE_PERCENT=4.78`, `GOOGLE_CLIENT_ID`, `SERPAPI_KEY`. Le port est fourni par Render (`PORT`). Un service gratuit s'endort après 15 min d'inactivité (premier appel ~1 min) : pour de vrais paiements, prendre une instance payante.

**Front (Vercel, dossier racine `frontend`)**, variables de build : `VITE_API_MODE=api`, `VITE_API_URL=https://<api>.onrender.com/api`. Le front est une SPA : `vercel.json` fournit la réécriture des routes.

## Vérifications effectuées
- Frontend : lint, build de production et 12 tests (parcours complet du backend simulé avec paiement, frais, commission, Google, rendu des pages, achat jusqu'à l'attente de paiement) passent.
- Migrations SQL `V1` + `V2` + `V3` exécutées sur PostgreSQL 16, en base neuve et en migration d'une base existante avec données.
- Backend Java : relu attentivement mais **non compilé dans l'environnement de génération** (Maven Central n'y est pas accessible). Lancez `docker compose up --build` : une éventuelle erreur de compilation apparaîtrait à cette étape (la syntaxe de tous les fichiers Java a été vérifiée avec `javac`).
- **Non testé** : les appels réels à CT Pay, à Google et à SerpApi (réseau indisponible depuis l'environnement de génération ; le mode `simulate` et les simulations du front couvrent le reste du parcours) et l'affichage sur de vrais téléphones/tablettes (aucun navigateur disponible : responsive vérifié par relecture du code et des tests de rendu).
