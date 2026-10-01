import { expect, it } from "vitest";
import { mockRequest as r } from "./mock";

// Parcours complet du backend simulé : mêmes règles que le vrai backend (modération, verrouillage, blocage…).
const check = (name, cond) => expect(cond, name).toBe(true);
const store = { get tx_mock_db_v3() { return localStorage.getItem("tx_mock_db_v3"); } };
const err = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const login = async (email, password) => (await r("POST", "/auth/login", { email, password })).token;

it("parcours complet : modération, achat, scan, verrouillage, blocage", async () => {
localStorage.clear();
const admin = await login("admin@tixora.demo", "Admin12345!");
const org = await login("organisateur@tixora.demo", "Demo12345!");
const cli = await login("client@tixora.demo", "Demo12345!");

let list = await r("GET", "/events?size=50");
check("liste publique = 7 à venir (ni terminé ni en attente)", list.total === 7);
check("événement terminé absent de la liste", !list.items.some((e) => e.title.includes("terminé")));
const feat = await r("GET", "/events/featured");
check("vedettes triées par j'aime", feat[0].likesCount >= feat[feat.length - 1].likesCount && feat.length > 0);
const near = await r("GET", "/events/nearby?lat=3.848&lng=11.502&radiusKm=30");
check("nearby Yaoundé : que Yaoundé, trié par distance", near.length >= 2 && near.every((e) => e.city === "Yaoundé") && near[0].distanceKm <= near[near.length - 1].distanceKm);

// inscription -> pas de connexion auto
const reg = await r("POST", "/auth/register", { firstName: "N", lastName: "T", email: "new@x.cm", password: "12345678", role: "CLIENT" });
check("inscription renvoie l'utilisateur (sans token)", reg.email === "new@x.cm" && !reg.token && !reg.password);
check("inscription ADMIN refusée", (await err(() => r("POST", "/auth/register", { firstName: "a", lastName: "b", email: "z@z.cm", password: "12345678", role: "ADMIN" })))?.status === 400);

// création par organisateur -> PENDING, invisible
const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 16);
const ev = await r("POST", "/events", { title: "Test", venue: "Salle", city: "Douala", category: "TECH", startsAt: soon, ticketTypes: [{ name: "Std", price: 1000, capacity: 2 }], latitude: 4.05, longitude: 9.7 }, org);
check("création => PENDING", ev.status === "PENDING");
check("PENDING invisible au public", (await err(() => r("GET", `/events/${ev.id}`)))?.status === 404);
check("PENDING visible à l'organisateur", (await r("GET", `/events/${ev.id}`, undefined, org)).id === ev.id);
check("achat refusé tant que non validé", (await err(() => r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }] }, cli)))?.status === 404);
check("admin seul peut valider", (await err(() => r("POST", `/admin/events/${ev.id}/approve`, {}, org)))?.status === 403);
check("refus exige un motif", (await err(() => r("POST", `/admin/events/${ev.id}/reject`, { reason: " " }, admin)))?.status === 400);
await r("POST", `/admin/events/${ev.id}/reject`, { reason: "Photo manquante" }, admin);
check("REJECTED + motif visible organisateur", (await r("GET", "/events/mine", undefined, org)).find((e) => e.id === ev.id).rejectionReason === "Photo manquante");
const upd = await r("PUT", `/events/${ev.id}`, { title: "Test 2", venue: "Salle", city: "Douala", category: "TECH", startsAt: soon }, org);
check("modification d'un refusé => repasse PENDING", upd.status === "PENDING");
await r("POST", `/admin/events/${ev.id}/approve`, {}, admin);
check("validé => visible", (await r("GET", `/events/${ev.id}`)).status === "APPROVED");

// achat avec paiement Mobile Money : commande en attente, billets émis seulement après succès
const age = (id) => { const db = JSON.parse(localStorage.getItem("tx_mock_db_v3")); db.orders.find((o) => o.id === id).createdAt -= 10000; localStorage.setItem("tx_mock_db_v3", JSON.stringify(db)); };
const pay = { operatorKey: "MOMO", phone: "677123456" };
check("opérateurs Mobile Money listés", (await r("GET", "/payments/operators", undefined, cli)).length === 2);
check("numéro invalide => 400", (await err(() => r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }], payment: { operatorKey: "MOMO", phone: "123" } }, cli)))?.status === 400);
check("opérateur invalide => 400", (await err(() => r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }], payment: { operatorKey: "XX", phone: "677123456" } }, cli)))?.status === 400);
const o1 = await r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 2 }], payment: pay }, cli);
check("commande en attente, frais CT Pay ajoutés, à la charge du client (2000 -> 2096)", o1.status === "PENDING" && o1.subtotal === 2000 && o1.total === 2096 && o1.fees === 96);
check("aucun billet avant le paiement", (await r("GET", "/tickets/mine", undefined, cli)).filter((t) => t.eventId === ev.id).length === 0);
check("places réservées pendant le paiement => 409", (await err(() => r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }], payment: pay }, cli)))?.status === 409);
age(o1.id);
check("paiement confirmé => SUCCESS", (await r("GET", `/orders/${o1.id}`, undefined, cli)).status === "SUCCESS");
const mine = (await r("GET", "/tickets/mine", undefined, cli)).filter((t) => t.eventId === ev.id);
check("2 billets émis avec leur design", mine.length === 2 && mine[0].design.template && /^#[0-9a-f]{6}$/.test(mine[0].design.color));
check("plus de place => 409", (await err(() => r("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }], payment: pay }, cli)))?.status === 409);
check("commande d'un autre client invisible", (await err(() => r("GET", `/orders/${o1.id}`, undefined, org)))?.status === 403);
const t1 = { tickets: mine };
await r("POST", "/controllers", { firstName: "C", lastName: "T", email: "c@x.cm", password: "12345678", eventId: ev.id }, org);
const ctok = await login("c@x.cm", "12345678");
check("scan VALID puis ALREADY_USED", (await r("POST", "/tickets/scan", { code: t1.tickets[0].code }, ctok)).result === "VALID" && (await r("POST", "/tickets/scan", { code: t1.tickets[0].code }, ctok)).result === "ALREADY_USED");

// j'aime
const like = await r("POST", `/events/${ev.id}/like`, {}, cli);
check("like +1", like.likesCount === 1 && like.likedByMe);
check("favoris contient l'événement", (await r("GET", "/events/favorites", undefined, cli)).some((e) => e.id === ev.id));
check("unlike", (await r("DELETE", `/events/${ev.id}/like`, undefined, cli)).likesCount === 0);
check("like sans connexion => 401", (await err(() => r("POST", `/events/${ev.id}/like`, {})))?.status === 401);

// paiement refusé (numéro finissant par 00) : places libérées, aucun billet
const ev2 = await r("POST", "/events", { title: "Autre", venue: "Salle", category: "TECH", startsAt: soon, ticketTypes: [{ name: "Std", price: 3000, capacity: 5 }], ticketTemplate: "MODERN", ticketColor: "#2563eb", ticketMessage: "Merci" }, org);
check("design du billet enregistré", ev2.ticketTemplate === "MODERN" && ev2.ticketColor === "#2563eb" && ev2.ticketMessage === "Merci");
check("gabarit invalide ignoré => CLASSIC", (await r("POST", "/events", { title: "Z", venue: "S", category: "TECH", startsAt: soon, ticketTypes: [{ name: "S", price: 1, capacity: 1 }], ticketTemplate: "HACK", ticketColor: "rouge" }, org)).ticketTemplate === "CLASSIC");
await r("POST", `/admin/events/${ev2.id}/approve`, {}, admin);
const o2 = await r("POST", "/orders", { eventId: ev2.id, items: [{ ticketTypeId: ev2.ticketTypes[0].id, quantity: 3 }], payment: { operatorKey: "OM", phone: "699999900" } }, cli);
age(o2.id);
check("paiement refusé => FAILED", (await r("GET", `/orders/${o2.id}`, undefined, cli)).status === "FAILED");
check("places libérées après échec", (await r("GET", `/events/${ev2.id}`)).ticketTypes[0].sold === 0);

// statistiques organisateur : total, commission 10 %, net
const st = await r("GET", "/organizer/stats", undefined, org);
check("stats : ventes 2000 FCFA, commission 200, net 1800", st.revenue === 2000 && st.commission === 200 && st.net === 1800 && st.ticketsSold === 2);
check("stats par événement et par type", st.events.find((e) => e.eventId === ev.id).types[0].revenue === 2000);
const payouts = await r("GET", "/admin/payouts", undefined, admin);
check("reversement : 2000 - 200 = 1800", payouts[0].revenue === 2000 && payouts[0].net === 1800);
check("admin : paiements listés", (await r("GET", "/admin/orders?status=FAILED", undefined, admin)).total === 1);
check("admin : commission dans les stats", (await r("GET", "/admin/stats", undefined, admin)).commission === 200);

// connexion Google : réservée aux clients
const g = await r("POST", "/auth/google", { credential: "nouveau.client@gmail.com" });
check("Google : crée un compte client", g.user.role === "CLIENT" && g.user.email === "nouveau.client@gmail.com");
check("Google : refusé pour un organisateur", (await err(() => r("POST", "/auth/google", { credential: "organisateur@tixora.demo" })))?.status === 403);

// événement terminé = verrouillé
const all = await r("GET", "/admin/events?status=APPROVED&size=50", undefined, admin);
const past = all.items.find((e) => e.ended);
check("événement passé marqué ended", Boolean(past));
check("achat sur terminé => 409", (await err(() => r("POST", "/orders", { eventId: past.id, items: [{ ticketTypeId: past.ticketTypes[0].id, quantity: 1 }] }, cli)))?.status === 409);
check("organisateur ne peut pas modifier un terminé", (await err(() => r("PUT", `/events/${past.id}`, { title: "X", venue: "Y", category: "GALA", startsAt: past.startsAt }, org)))?.status === 409);
const fixed = await r("PUT", `/admin/events/${past.id}`, { title: "Gala corrigé", venue: past.venue, city: past.city, category: "GALA", startsAt: past.startsAt }, admin);
check("l'admin peut corriger un terminé", fixed.title === "Gala corrigé");

// blocage / suppression
const users = await r("GET", "/admin/users?role=CLIENT&size=50", undefined, admin);
const awa = users.items.find((u) => u.email === "client@tixora.demo");
await r("POST", `/admin/users/${awa.id}/block`, {}, admin);
check("client bloqué ne peut plus se connecter (403)", (await err(() => login("client@tixora.demo", "Demo12345!")))?.status === 403);
check("son ancien jeton ne marche plus (401)", (await err(() => r("GET", "/auth/me", undefined, cli)))?.status === 401);
await r("POST", `/admin/users/${awa.id}/unblock`, {}, admin);
check("débloqué => reconnexion OK", Boolean(await login("client@tixora.demo", "Demo12345!")));
check("suppression client avec billets refusée (409)", (await err(() => r("DELETE", `/admin/users/${awa.id}`, undefined, admin)))?.status === 409);
const newu = (await r("GET", "/admin/users?q=new@x.cm", undefined, admin)).items[0];
await r("DELETE", `/admin/users/${newu.id}`, undefined, admin);
check("suppression client sans activité OK", (await r("GET", "/admin/users?q=new@x.cm", undefined, admin)).total === 0);
const orgUser = (await r("GET", "/admin/users?role=ORGANISATEUR", undefined, admin)).items[0];
await r("POST", `/admin/users/${orgUser.id}/block`, {}, admin);
check("organisateur bloqué => ses événements disparaissent", (await r("GET", "/events?size=50")).total === 0);
check("admin ne peut pas se bloquer / bloquer un admin", (await err(() => r("POST", `/admin/users/${JSON.parse(store.tx_mock_db_v3).users[0].id}/block`, {}, admin))) !== null);
check("stats admin", (await r("GET", "/admin/stats", undefined, admin)).ticketsSold === 2);
}, 30000);
