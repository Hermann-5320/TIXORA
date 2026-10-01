# Contrat d'API Tixora

Base : `VITE_API_URL` (ex. `http://localhost:8082/api` avec Docker). Authentification : en-tête `Authorization: Bearer <jwt>`.
Erreurs : statut HTTP adapté et corps JSON `{ "message": "texte affichable" }`.
Rôles : `CLIENT`, `ORGANISATEUR`, `CONTROLEUR`, `ADMIN`. Le mode `mock` du frontend (`src/api/mock.js`) applique les mêmes règles.

## Règles métier
- Un événement créé par un organisateur est `PENDING` ; il n'est visible du public qu'une fois `APPROVED` par un admin (ou `REJECTED` avec motif ; une modification par l'organisateur le remet en `PENDING`).
- Un événement est **terminé** (`ended: true`) quand l'heure de fin est passée (sans heure de fin : début + 6 h, fuseau `APP_TIMEZONE`). Il est alors **verrouillé** : plus de vente (409), plus de modification par l'organisateur (409), plus de contrôle (`EVENT_ENDED`). Seul l'admin peut le corriger (`PUT /admin/events/{id}`).
- Un compte `BLOCKED` ne peut plus se connecter (403) et son jeton cesse de fonctionner immédiatement ; ses événements disparaissent du public.
- Suppression d'un compte : refusée (409) s'il a des billets (client) ou des ventes (organisateur) ; il faut alors le bloquer.

## Public
| Méthode | Route | Réponse |
|---|---|---|
| POST | /auth/register | `{firstName,lastName,email,password,role: CLIENT\|ORGANISATEUR,phone?,organization?}` → utilisateur (pas de connexion automatique) |
| POST | /auth/login | `{email,password}` → `{token,user}` ; 403 si compte bloqué |
| GET | /auth/me | utilisateur courant |
| GET | /stats | `{events,cities,ticketsSold}` |
| GET | /events?q&category&city&page&size | `{items:[Event],total,page,size,last}` (à venir, publiés) |
| GET | /events/featured | 6 événements les plus aimés |
| GET | /events/nearby?lat&lng&radiusKm | événements autour d'un point, triés par `distanceKm` |
| GET | /events/{id} | Event (non publié : visible seulement de son organisateur et des admins) |
| GET | /config | `{commissionPercent,feePercent,paymentMode: live\|simulate,googleClientId}` (aucun secret) |
| POST | /auth/google | `{credential}` (jeton d'identité Google) → `{token,user}` ; compte CLIENT créé au besoin, 403 pour les autres rôles ou compte bloqué |
| GET | /organizers/{id}/logo | logo de l'organisateur (cache longue durée) |
| POST | /payments/ctpay/callback | notification CT Pay (`status`,`id`), jamais crue : l'état est revérifié auprès de CT Pay ; répond toujours 200 |
| GET | /events/{id}/image | photo (image/jpeg, png ou webp), cache longue durée |
| GET | /share/events/{id} | page HTML avec balises Open Graph, redirige vers `/evenements/{id}` du frontend |

## Connecté
| Méthode | Route | Rôle | Détail |
|---|---|---|---|
| POST / DELETE | /events/{id}/like | tout compte | → `{likesCount,likedByMe}` |
| GET | /events/favorites | tout compte | événements aimés |
| GET | /events/mine | ORGANISATEUR | ses événements, tous statuts |
| POST | /events | ORGANISATEUR | `{title,venue,city?,category,description?,startsAt,endsAt?,latitude?,longitude?,ticketTypes:[{name,price,capacity}],ticketTemplate?: CLASSIC\|MODERN\|FESTIVAL\|MINIMAL,ticketColor?: #RRGGBB,ticketMessage?: ≤140}` → Event `PENDING` |
| PUT | /events/{id} | ORGANISATEUR | mêmes champs (sans `ticketTypes`), refusé si terminé |
| POST | /events/{id}/image | ORGANISATEUR, ADMIN | multipart `file` (JPEG/PNG/WebP, 3 Mo max, format vérifié par signature) |
| GET | /payments/operators | CLIENT | opérateurs Mobile Money actifs `[{key,name}]` (récupérés auprès de CT Pay) |
| POST | /orders | CLIENT | `{eventId,items:[{ticketTypeId,quantity}],payment:{operatorKey,phone}}` → `{id,status,subtotal,fees,total,failureReason,expiresAt}` ; réserve les places et lance le paiement. `status` : `PENDING` (en attente de validation sur le téléphone), `SUCCESS` (billets émis, ex. événement gratuit). 409 si plus de place, 400 si numéro/opérateur invalide |
| GET | /orders/{id} | CLIENT | état de la commande, à interroger toutes les 3 s : `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`, `REFUND_NEEDED` (paiement reçu mais plus de place) |
| GET | /organizer/stats | ORGANISATEUR | `{revenue,commissionPercent,commission,net,ticketsSold,events:[{eventId,ticketsSold,revenue,types:[{name,sold,revenue}]}]}` (billets payés uniquement) |
| POST / DELETE | /organizer/logo | ORGANISATEUR | multipart `file` (JPEG/PNG/WebP, 1 Mo max) / suppression → utilisateur (`hasLogo`, `logoUpdatedAt`) |
| GET | /places/search?q | ORGANISATEUR, ADMIN | lieux (SerpApi) `[{title,address,latitude,longitude}]` ; 503 sans clé, 429 au-delà de 40 recherches/heure |
| GET | /tickets/mine | CLIENT | billets |
| POST | /tickets/scan | CONTROLEUR, ORGANISATEUR | `{code}` → `{result: VALID\|ALREADY_USED\|INVALID\|EVENT_ENDED, ticket?}` |
| POST / GET | /controllers | ORGANISATEUR | création / liste des contrôleurs |

## Administration (rôle ADMIN)
| Méthode | Route | Détail |
|---|---|---|
| GET | /admin/stats | compteurs (événements par statut, comptes, billets, ventes, `commissionPercent`, `commission`, `refundsNeeded`) |
| GET | /admin/payouts | reversements : `[{organizerId,name,email,phone,ticketsSold,revenue,commission,net}]` |
| GET | /admin/orders?status&page&size | paiements (`status` : PENDING, SUCCESS, FAILED, EXPIRED, REFUND_NEEDED) |
| GET | /admin/events?status&q&page&size | tous les événements |
| POST | /admin/events/{id}/approve | valide |
| POST | /admin/events/{id}/reject | `{reason}` (obligatoire) |
| PUT | /admin/events/{id} | correction, y compris d'un événement terminé |
| GET | /admin/users?role&q&page&size | comptes |
| POST | /admin/users/{id}/block · /unblock | bloque / débloque |
| DELETE | /admin/users/{id} | supprime (voir règles) |

## Objets
`Event` : `{id,title,venue,city,description,category,startsAt,endsAt,latitude,longitude,image,status,rejectionReason,ended,organizerId,organizerName,organizerLogo,ticketTemplate,ticketColor,ticketMessage,ticketTypes:[{id,name,price,capacity,sold}],likesCount,likedByMe,distanceKm}`
`image` est un chemin relatif à la base de l'API (ex. `/events/{id}/image?v=…`). Catégories : `MUSIQUE, SPORT, CULTURE, TECH, GASTRONOMIE, BUSINESS, GALA`.
`Ticket` : `{id,code,eventId,eventTitle,venue,city,startsAt,categoryName,price,status: VALID|USED,organizerName,design:{template,color,message,logo}}` — `code` est la valeur du QR code, signée côté serveur.

Frais : CT Pay ajoute ses frais au montant envoyé (`fees` ≈ `feePercent` %) ; `total = subtotal + fees` est débité au client (estimation avant paiement, valeurs réelles de CT Pay ensuite). Commission : `commission = round(ventes × commissionPercent / 100)`, déduite par l'admin lors du reversement.
