// Backend simulé pour développer et démontrer le frontend sans serveur (VITE_API_MODE=mock).
// Les routes ci-dessous reproduisent le contrat d'API du vrai backend (voir docs/API_CONTRACT.md).
const KEY = "tx_mock_db_v3";
const DEFAULT_HOURS = 6;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const pub = ({ password, logoData, ...user }) => ({ ...user, ...(logoData && { logo: logoData }) });
const now = () => new Date();
const iso = (d) => { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`; };
const uid = () => crypto.randomUUID();

function seed() {
  const t0 = new Date(); t0.setHours(18, 0, 0, 0);
  const at = (days) => iso(new Date(t0.getTime() + days * 86400000));
  const org = { id: uid(), firstName: "Studio", lastName: "Tixora", email: "organisateur@tixora.demo", password: "Demo12345!", role: "ORGANISATEUR", organization: "Tixora Live", status: "ACTIVE", createdAt: iso(now()) };
  const client = { id: uid(), firstName: "Awa", lastName: "Client", email: "client@tixora.demo", password: "Demo12345!", role: "CLIENT", status: "ACTIVE", createdAt: iso(now()) };
  const admin = { id: uid(), firstName: "Admin", lastName: "Tixora", email: "admin@tixora.demo", password: "Admin12345!", role: "ADMIN", status: "ACTIVE", createdAt: iso(now()) };
  const ev = (title, category, venue, city, latitude, longitude, days, description, types, status = "APPROVED") => ({
    id: uid(), title, category, venue, city, latitude, longitude, startsAt: at(days), endsAt: null, description, status, rejectionReason: null,
    image: null, organizerId: org.id, createdAt: iso(now()), ticketTypes: types.map(([name, price, capacity]) => ({ id: uid(), name, price, capacity, sold: 0 })),
  });
  const events = [
    ev("Festival Yaoundé Live", "MUSIQUE", "Palais des Sports de Warda", "Yaoundé", 3.8836, 11.527, 12, "Une nuit de concerts avec les grandes voix du Cameroun.", [["Classique", 4000, 800], ["VIP", 15000, 120]]),
    ev("Douala Tech Summit", "TECH", "Hôtel Sawa", "Douala", 4.0511, 9.7679, 20, "Conférences, ateliers et networking autour de l'IA et du cloud.", [["Standard", 5000, 300], ["Pass Pro", 20000, 60]]),
    ev("Kribi Beach Party", "GALA", "Plage de Mpalla", "Kribi", 2.94, 9.91, 31, "Soirée sur la plage, DJ sets et feu d'artifice.", [["Entrée", 3000, 500], ["Carré VIP", 25000, 40]]),
    ev("Les Saveurs du Cameroun", "GASTRONOMIE", "Musée National", "Yaoundé", 3.8667, 11.5167, 8, "Festival de la gastronomie et des terroirs.", [["Dégustation", 6500, 250]]),
    ev("Derby de la Réunification", "SPORT", "Stade de la Réunification", "Douala", 4.073, 9.73, 15, "Le grand derby de la saison.", [["Tribune", 2000, 1500], ["Loge", 12000, 100]]),
    ev("Nuit de la Culture Bamiléké", "CULTURE", "Place des Fêtes", "Bafoussam", 5.4737, 10.4179, 25, "Danses, contes et art traditionnel des Grassfields.", [["Public", 1500, 700]]),
    ev("Forum Business Afrique Centrale", "BUSINESS", "Palais des Congrès", "Yaoundé", 3.8792, 11.5183, 40, "Rencontres entre entrepreneurs, investisseurs et institutions.", [["Participant", 10000, 400]]),
    ev("Gala d'ouverture de la saison (terminé)", "GALA", "Hôtel Hilton", "Yaoundé", 3.865, 11.521, -10, "Soirée de gala de la saison précédente.", [["Table", 50000, 30]]),
    ev("Concert Gospel de Noël", "MUSIQUE", "Cathédrale Notre-Dame", "Douala", 4.0483, 9.7043, 60, "Grand concert de chorales.", [["Entrée", 2500, 900]], "PENDING"),
  ];
  const tpl = ["FESTIVAL", "MODERN", "FESTIVAL", "CLASSIC", "MODERN", "MINIMAL", "CLASSIC", "CLASSIC", "MINIMAL"], col = ["#e11d74", "#2563eb", "#f59e0b", "#ea580c", "#16a34a", "#9333ea", "#0f766e", "#c026d3", "#475569"];
  events.forEach((e, i) => { e.ticketTemplate = tpl[i]; e.ticketColor = col[i]; e.ticketMessage = i === 0 ? "Bonne soirée et merci de votre présence !" : null; });
  const likes = events.slice(0, 4).map((e) => ({ userId: client.id, eventId: e.id, at: iso(now()) }));
  return { users: [admin, org, client], events, tickets: [], likes, orders: [] };
}

const load = () => { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); const db = seed(); save(db); return db; };
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

const endOf = (e) => (e.endsAt ? new Date(e.endsAt) : new Date(new Date(e.startsAt).getTime() + DEFAULT_HOURS * 3600000));
const isEnded = (e) => now() > endOf(e);
const blocked = (db, id) => db.users.find((u) => u.id === id)?.status === "BLOCKED";
const isPublic = (db, e) => e.status === "APPROVED" && !blocked(db, e.organizerId);
const name = (u) => u?.organization || `${u?.firstName || ""} ${u?.lastName || ""}`.trim();

const view = (db, e, viewer, distanceKm = null) => ({
  ...e, ended: isEnded(e), organizerName: name(db.users.find((u) => u.id === e.organizerId)), organizerLogo: db.users.find((u) => u.id === e.organizerId)?.logoData || null,
  likesCount: db.likes.filter((l) => l.eventId === e.id).length,
  likedByMe: Boolean(viewer && db.likes.some((l) => l.eventId === e.id && l.userId === viewer.id)), distanceKm,
});
const need = (user, ...roles) => {
  if (!user) fail(401, "Authentification requise");
  if (roles.length && !roles.includes(user.role)) fail(403, "Acces refuse");
  return user;
};
const paginate = (list, q) => {
  const size = Math.min(50, Number(q.size) || 12), page = Math.max(0, Number(q.page) || 0);
  return { items: list.slice(page * size, page * size + size), total: list.length, page, size, last: (page + 1) * size >= list.length };
};
const km = (a, b, c, d) => {
  const r = (x) => (x * Math.PI) / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742.0176 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const CATEGORIES = ["MUSIQUE", "SPORT", "CULTURE", "TECH", "GASTRONOMIE", "BUSINESS", "GALA"];

function applyFields(e, b, mustBeFuture) {
  if (!CATEGORIES.includes(b.category)) fail(400, "Categorie invalide");
  if (mustBeFuture && new Date(b.startsAt) <= now()) fail(400, "La date de l'evenement doit etre dans le futur");
  if (b.endsAt && new Date(b.endsAt) <= new Date(b.startsAt)) fail(400, "L'heure de fin doit suivre le debut");
  Object.assign(e, {
    title: b.title.trim(), venue: b.venue.trim(), city: b.city || null, description: b.description || "", category: b.category,
    startsAt: b.startsAt.length === 16 ? `${b.startsAt}:00` : b.startsAt, endsAt: b.endsAt ? (b.endsAt.length === 16 ? `${b.endsAt}:00` : b.endsAt) : null,
    latitude: b.latitude ?? null, longitude: b.longitude ?? null,
    ticketTemplate: ["CLASSIC", "MODERN", "FESTIVAL", "MINIMAL"].includes(b.ticketTemplate) ? b.ticketTemplate : "CLASSIC",
    ticketColor: /^#[0-9a-fA-F]{6}$/.test(b.ticketColor || "") ? b.ticketColor.toLowerCase() : "#f24e12", ticketMessage: b.ticketMessage?.trim() || null,
  });
}

const visibleUpcoming = (db) => db.events.filter((e) => isPublic(db, e) && !isEnded(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

const orderView = (o) => ({ id: o.id, status: o.status, subtotal: o.subtotal, fees: o.fees, total: o.total, failureReason: o.failureReason || null, expiresAt: o.expiresAt });

function settle(db, order, success) {
  const event = db.events.find((e) => e.id === order.eventId);
  if (!success) {
    order.lines.forEach((l) => { const t = event.ticketTypes.find((x) => x.id === l.ticketTypeId); if (t) t.sold = Math.max(0, t.sold - l.quantity); });
    order.status = "FAILED"; order.failureReason = "Paiement refuse ou annule";
    return;
  }
  order.lines.forEach((l) => { for (let i = 0; i < l.quantity; i++) db.tickets.push({ id: uid(), code: uid(), eventId: event.id, eventTitle: event.title, venue: event.venue, startsAt: event.startsAt, categoryName: l.name, price: l.price, ownerId: order.buyerId, status: "VALID", orderId: order.id }); });
  order.status = "SUCCESS"; order.paidAt = iso(now());
}

const commissionOf = (revenue) => Math.floor((revenue * 10 + 50) / 100);

const routes = [
  ["POST", /^\/auth\/register$/, (db, { body }) => {
    if (!["CLIENT", "ORGANISATEUR"].includes(body.role)) fail(400, "Role invalide");
    if (db.users.some((u) => u.email === body.email.toLowerCase())) fail(409, "Un compte existe deja avec cet email");
    const user = { ...body, email: body.email.toLowerCase(), id: uid(), status: "ACTIVE", createdAt: iso(now()) };
    db.users.push(user);
    return pub(user);
  }],
  ["POST", /^\/auth\/login$/, (db, { body }) => {
    const user = db.users.find((u) => u.email === body.email.toLowerCase() && u.password === body.password);
    if (!user) fail(401, "Email ou mot de passe incorrect");
    if (user.status === "BLOCKED") fail(403, "Ce compte a ete bloque. Contactez le support Tixora.");
    return { token: `mock.${user.id}`, user: pub(user) };
  }],
  ["GET", /^\/auth\/me$/, (db, { user }) => pub(need(user))],
  ["GET", /^\/stats$/, (db) => { const v = db.events.filter((e) => isPublic(db, e)); return { events: v.length, cities: new Set(v.map((e) => (e.city || "").toLowerCase()).filter(Boolean)).size, ticketsSold: db.tickets.length }; }],

  ["GET", /^\/events$/, (db, { query, user }) => {
    const q = (query.q || "").toLowerCase(), city = (query.city || "").toLowerCase(), cat = (query.category || "").toUpperCase();
    const list = visibleUpcoming(db).filter((e) => (!cat || e.category === cat) && (!city || (e.city || "").toLowerCase() === city)
      && (!q || `${e.title} ${e.venue} ${e.city || ""}`.toLowerCase().includes(q)));
    const p = paginate(list, query);
    return { ...p, items: p.items.map((e) => view(db, e, user)) };
  }],
  ["GET", /^\/events\/featured$/, (db, { user }) => visibleUpcoming(db).map((e) => view(db, e, user))
    .sort((a, b) => b.likesCount - a.likesCount || a.startsAt.localeCompare(b.startsAt)).slice(0, 6)],
  ["GET", /^\/events\/nearby$/, (db, { query, user }) => {
    const lat = Number(query.lat), lng = Number(query.lng), radius = Math.min(2000, Math.max(1, Number(query.radiusKm) || 50));
    return visibleUpcoming(db).filter((e) => e.latitude != null).map((e) => [e, km(lat, lng, e.latitude, e.longitude)])
      .filter(([, d]) => d <= radius).sort((a, b) => a[1] - b[1]).map(([e, d]) => view(db, e, user, Math.round(d * 10) / 10));
  }],
  ["GET", /^\/events\/favorites$/, (db, { user }) => {
    need(user);
    return db.likes.filter((l) => l.userId === user.id).sort((a, b) => b.at.localeCompare(a.at))
      .map((l) => db.events.find((e) => e.id === l.eventId)).filter((e) => e && isPublic(db, e)).map((e) => view(db, e, user));
  }],
  ["GET", /^\/events\/mine$/, (db, { user }) => db.events.filter((e) => e.organizerId === need(user, "ORGANISATEUR").id)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)).map((e) => view(db, e, user))],
  ["GET", /^\/events\/([^/]+)$/, (db, { params, user }) => {
    const e = db.events.find((x) => x.id === params[0]);
    if (!e || (!isPublic(db, e) && !(user && (user.role === "ADMIN" || user.id === e.organizerId)))) fail(404, "Evenement introuvable");
    return view(db, e, user);
  }],
  ["POST", /^\/events$/, (db, { user, body }) => {
    need(user, "ORGANISATEUR");
    if (!body.ticketTypes?.length) fail(400, "Ajoutez au moins un type de billet");
    const e = { id: uid(), organizerId: user.id, status: "PENDING", rejectionReason: null, image: null, createdAt: iso(now()),
      ticketTypes: body.ticketTypes.map((t) => ({ ...t, id: uid(), sold: 0 })) };
    applyFields(e, body, true);
    db.events.push(e);
    return view(db, e, user);
  }],
  ["PUT", /^\/events\/([^/]+)$/, (db, { user, body, params }) => {
    need(user, "ORGANISATEUR");
    const e = db.events.find((x) => x.id === params[0] && x.organizerId === user.id) || fail(404, "Evenement introuvable");
    if (isEnded(e)) fail(409, "Evenement termine : il est verrouille, contactez l'administrateur pour le corriger");
    applyFields(e, body, body.startsAt.slice(0, 16) !== e.startsAt.slice(0, 16));
    if (e.status === "REJECTED") { e.status = "PENDING"; e.rejectionReason = null; }
    return view(db, e, user);
  }],
  ["POST", /^\/events\/([^/]+)\/like$/, (db, { user, params }) => likeToggle(db, need(user), params[0], true)],
  ["DELETE", /^\/events\/([^/]+)\/like$/, (db, { user, params }) => likeToggle(db, need(user), params[0], false)],

  ["GET", /^\/config$/, () => ({ commissionPercent: 10, feePercent: 4.78, paymentMode: "simulate", googleClientId: "mock" })],
  ["GET", /^\/payments\/operators$/, (db, { user }) => { need(user, "CLIENT"); return [{ key: "MOMO", name: "MTN Mobile Money" }, { key: "OM", name: "Orange Money" }]; }],
  ["POST", /^\/orders$/, (db, { user, body }) => {
    need(user, "CLIENT");
    const event = db.events.find((e) => e.id === body.eventId);
    if (!event || !isPublic(db, event)) fail(404, "Evenement introuvable");
    if (isEnded(event)) fail(409, "Evenement termine : la vente de billets est fermee");
    const lines = []; let subtotal = 0, qtyTotal = 0;
    for (const { ticketTypeId, quantity } of body.items) {
      const type = event.ticketTypes.find((c) => c.id === ticketTypeId) || fail(400, "Type de billet invalide");
      if (quantity < 1 || quantity > 10) fail(400, "Quantite invalide (1 a 10 par type de billet)");
      if (type.capacity - type.sold < quantity) fail(409, `Plus assez de places pour le billet ${type.name}`);
      lines.push({ type, quantity }); subtotal += type.price * quantity; qtyTotal += quantity;
    }
    if (qtyTotal > 20) fail(400, "Maximum 20 billets par commande");
    const phone = (body.payment?.phone || "").replace(/\D/g, "");
    if (subtotal > 0 && !/^(237)?6\d{8}$/.test(phone)) fail(400, "Numero Mobile Money invalide (ex. 6XXXXXXXX)");
    if (subtotal > 0 && !["MOMO", "OM"].includes(body.payment?.operatorKey)) fail(400, "Operateur Mobile Money invalide");
    lines.forEach(({ type, quantity }) => { type.sold += quantity; });
    const total = subtotal > 0 ? subtotal + Math.ceil((subtotal * 478) / 10000) : 0;
    const order = { id: uid(), buyerId: user.id, eventId: event.id, status: "PENDING", subtotal, fees: total - subtotal, total, phone, createdAt: Date.now(),
      expiresAt: new Date(Date.now() + 600000).toISOString(), lines: lines.map(({ type, quantity }) => ({ ticketTypeId: type.id, name: type.name, price: type.price, quantity })) };
    db.orders.push(order);
    if (subtotal === 0) settle(db, order, true);
    return orderView(order);
  }],
  ["GET", /^\/orders\/([^/]+)$/, (db, { user, params }) => {
    const order = db.orders.find((o) => o.id === params[0] && o.buyerId === need(user, "CLIENT").id) || fail(404, "Commande introuvable");
    // Simulation : le paiement aboutit apres ~3,5 s (echec si le numero se termine par 00).
    if (order.status === "PENDING" && Date.now() - order.createdAt > 3500) settle(db, order, !order.phone.endsWith("00"));
    return orderView(order);
  }],
  ["GET", /^\/tickets\/mine$/, (db, { user }) => db.tickets.filter((t) => t.ownerId === need(user, "CLIENT").id).map((t) => {
    const e = db.events.find((x) => x.id === t.eventId), org = db.users.find((u) => u.id === e?.organizerId);
    return { ...t, city: e?.city || null, organizerName: name(org), design: { template: e?.ticketTemplate || "CLASSIC", color: e?.ticketColor || "#f24e12", message: e?.ticketMessage || null, logo: org?.logoData || null } };
  })],
  ["GET", /^\/organizer\/stats$/, (db, { user }) => {
    const mine = db.events.filter((e) => e.organizerId === need(user, "ORGANISATEUR").id);
    let revenue = 0, sold = 0;
    const events = mine.map((e) => {
      const ts = db.tickets.filter((t) => t.eventId === e.id), byType = {};
      ts.forEach((t) => { byType[t.categoryName] ||= { name: t.categoryName, sold: 0, revenue: 0 }; byType[t.categoryName].sold++; byType[t.categoryName].revenue += t.price; });
      const r = ts.reduce((n, t) => n + t.price, 0); revenue += r; sold += ts.length;
      return { eventId: e.id, ticketsSold: ts.length, revenue: r, types: Object.values(byType) };
    });
    const commission = commissionOf(revenue);
    return { revenue, commissionPercent: 10, commission, net: revenue - commission, ticketsSold: sold, events };
  }],
  ["DELETE", /^\/organizer\/logo$/, (db, { user }) => { const u = db.users.find((x) => x.id === need(user, "ORGANISATEUR").id); delete u.logoData; u.hasLogo = false; return pub(u); }],
  ["GET", /^\/places\/search$/, () => fail(503, "Recherche de lieux non configuree")],
  ["POST", /^\/auth\/google$/, (db, { body }) => {
    const email = String(body.credential || "").toLowerCase();
    let u = db.users.find((x) => x.email === email);
    if (!u) { u = { id: uid(), firstName: email.split("@")[0], lastName: "", email, role: "CLIENT", status: "ACTIVE", createdAt: iso(now()) }; db.users.push(u); }
    else if (u.role !== "CLIENT") fail(403, "La connexion Google est reservee aux comptes clients");
    if (u.status === "BLOCKED") fail(403, "Ce compte a ete bloque. Contactez le support Tixora.");
    return { token: `mock.${u.id}`, user: pub(u) };
  }],
  ["POST", /^\/tickets\/scan$/, (db, { user, body }) => {
    need(user, "CONTROLEUR", "ORGANISATEUR");
    const ticket = db.tickets.find((t) => t.code === body.code);
    const event = ticket && db.events.find((e) => e.id === ticket.eventId);
    const allowed = ticket && (user.role === "CONTROLEUR" ? ticket.eventId === user.eventId : event?.organizerId === user.id);
    if (!allowed) return { result: "INVALID" };
    if (isEnded(event)) return { result: "EVENT_ENDED", ticket };
    if (ticket.status === "USED") return { result: "ALREADY_USED", ticket };
    ticket.status = "USED";
    return { result: "VALID", ticket };
  }],
  ["POST", /^\/controllers$/, (db, { user, body }) => {
    need(user, "ORGANISATEUR");
    if (!db.events.some((e) => e.id === body.eventId && e.organizerId === user.id)) fail(400, "Evenement invalide");
    if (db.users.some((u) => u.email === body.email.toLowerCase())) fail(409, "Un compte existe deja avec cet email");
    const ctrl = { ...body, email: body.email.toLowerCase(), id: uid(), role: "CONTROLEUR", organizerId: user.id, status: "ACTIVE", createdAt: iso(now()) };
    db.users.push(ctrl);
    return pub(ctrl);
  }],
  ["GET", /^\/controllers$/, (db, { user }) => db.users.filter((u) => u.role === "CONTROLEUR" && u.organizerId === need(user, "ORGANISATEUR").id).map(pub)],

  // --- Administration ---
  ["GET", /^\/admin\/stats$/, (db, { user }) => {
    need(user, "ADMIN");
    const c = (s) => db.events.filter((e) => e.status === s).length, r = (role) => db.users.filter((u) => u.role === role).length;
    return { pendingEvents: c("PENDING"), approvedEvents: c("APPROVED"), rejectedEvents: c("REJECTED"), clients: r("CLIENT"), organizers: r("ORGANISATEUR"),
      controllers: r("CONTROLEUR"), blockedUsers: db.users.filter((u) => u.status === "BLOCKED").length, ticketsSold: db.tickets.length, revenue: db.tickets.reduce((s, t) => s + t.price, 0),
      commissionPercent: 10, commission: commissionOf(db.tickets.reduce((s, t) => s + t.price, 0)), refundsNeeded: db.orders.filter((o) => o.status === "REFUND_NEEDED").length };
  }],
  ["GET", /^\/admin\/payouts$/, (db, { user }) => {
    need(user, "ADMIN");
    const by = {};
    db.tickets.forEach((t) => { const e = db.events.find((x) => x.id === t.eventId); if (!e) return; by[e.organizerId] ||= { n: 0, r: 0 }; by[e.organizerId].n++; by[e.organizerId].r += t.price; });
    return Object.entries(by).map(([id, v]) => { const u = db.users.find((x) => x.id === id); const c = commissionOf(v.r);
      return { organizerId: id, name: name(u), email: u?.email, phone: u?.phone || null, ticketsSold: v.n, revenue: v.r, commission: c, net: v.r - c }; }).sort((a, b) => b.revenue - a.revenue);
  }],
  ["GET", /^\/admin\/orders$/, (db, { user, query }) => {
    need(user, "ADMIN");
    const list = db.orders.filter((o) => !query.status || o.status === query.status).sort((a, b) => b.createdAt - a.createdAt);
    const p = paginate(list, { ...query, size: query.size || 20 });
    return { ...p, items: p.items.map((o) => ({ id: o.id, status: o.status, eventTitle: db.events.find((e) => e.id === o.eventId)?.title, buyerEmail: db.users.find((u) => u.id === o.buyerId)?.email,
      phone: o.phone, subtotal: o.subtotal, fees: o.fees, total: o.total, processCode: o.processCode || null, failureReason: o.failureReason || null, createdAt: new Date(o.createdAt).toISOString() })) };
  }],
  ["GET", /^\/admin\/events$/, (db, { user, query }) => {
    need(user, "ADMIN");
    const q = (query.q || "").toLowerCase();
    const list = db.events.filter((e) => (!query.status || e.status === query.status) && (!q || `${e.title} ${e.venue}`.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const p = paginate(list, { ...query, size: query.size || 20 });
    return { ...p, items: p.items.map((e) => view(db, e, user)) };
  }],
  ["POST", /^\/admin\/events\/([^/]+)\/approve$/, (db, { user, params }) => {
    need(user, "ADMIN");
    const e = db.events.find((x) => x.id === params[0]) || fail(404, "Evenement introuvable");
    e.status = "APPROVED"; e.rejectionReason = null;
    return view(db, e, user);
  }],
  ["POST", /^\/admin\/events\/([^/]+)\/reject$/, (db, { user, params, body }) => {
    need(user, "ADMIN");
    const e = db.events.find((x) => x.id === params[0]) || fail(404, "Evenement introuvable");
    if (!body.reason?.trim()) fail(400, "Indiquez le motif du refus");
    e.status = "REJECTED"; e.rejectionReason = body.reason.trim();
    return view(db, e, user);
  }],
  ["PUT", /^\/admin\/events\/([^/]+)$/, (db, { user, params, body }) => {
    need(user, "ADMIN");
    const e = db.events.find((x) => x.id === params[0]) || fail(404, "Evenement introuvable");
    applyFields(e, body, false);
    return view(db, e, user);
  }],
  ["GET", /^\/admin\/users$/, (db, { user, query }) => {
    need(user, "ADMIN");
    const q = (query.q || "").toLowerCase();
    const list = db.users.filter((u) => (!query.role || u.role === query.role) && (!q || `${u.email} ${u.firstName} ${u.lastName} ${u.organization || ""}`.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const p = paginate(list, { ...query, size: query.size || 20 });
    return { ...p, items: p.items.map(pub) };
  }],
  ["POST", /^\/admin\/users\/([^/]+)\/(block|unblock)$/, (db, { user, params }) => {
    const u = adminTarget(db, user, params[0]);
    u.status = params[1] === "block" ? "BLOCKED" : "ACTIVE";
    return pub(u);
  }],
  ["DELETE", /^\/admin\/users\/([^/]+)$/, (db, { user, params }) => {
    const u = adminTarget(db, user, params[0]);
    if (u.role === "CLIENT" && db.tickets.some((t) => t.ownerId === u.id)) fail(409, "Ce client possede des billets : bloquez-le plutot que de le supprimer");
    if (u.role === "ORGANISATEUR") {
      const mine = db.events.filter((e) => e.organizerId === u.id);
      if (db.tickets.some((t) => mine.some((e) => e.id === t.eventId))) fail(409, "Cet organisateur a vendu des billets : bloquez-le plutot que de le supprimer");
      db.events = db.events.filter((e) => e.organizerId !== u.id);
      db.users = db.users.filter((x) => x.organizerId !== u.id);
    }
    db.likes = db.likes.filter((l) => l.userId !== u.id && db.events.some((e) => e.id === l.eventId));
    db.orders = db.orders.filter((o) => o.buyerId !== u.id);
    db.users = db.users.filter((x) => x.id !== u.id);
    return null;
  }],
];

function adminTarget(db, user, id) {
  need(user, "ADMIN");
  const u = db.users.find((x) => x.id === id) || fail(404, "Utilisateur introuvable");
  if (u.id === user.id) fail(400, "Vous ne pouvez pas agir sur votre propre compte");
  if (u.role === "ADMIN") fail(403, "Les comptes administrateur sont proteges");
  return u;
}

function likeToggle(db, user, eventId, on) {
  const e = db.events.find((x) => x.id === eventId);
  if (!e || e.status !== "APPROVED") fail(404, "Evenement introuvable");
  db.likes = db.likes.filter((l) => !(l.userId === user.id && l.eventId === eventId));
  if (on) db.likes.push({ userId: user.id, eventId, at: iso(now()) });
  return { likesCount: db.likes.filter((l) => l.eventId === eventId).length, likedByMe: on };
}

const authUser = (db, token) => (token?.startsWith("mock.") ? db.users.find((u) => u.id === token.slice(5) && u.status !== "BLOCKED") : null);

export async function mockRequest(method, fullPath, body, token) {
  await new Promise((r) => setTimeout(r, 150));
  const [path, qs] = fullPath.split("?");
  const db = load();
  const user = authUser(db, token);
  for (const [m, re, handler] of routes) {
    const match = m === method && path.match(re);
    if (!match) continue;
    const result = handler(db, { body, user, query: Object.fromEntries(new URLSearchParams(qs)), params: match.slice(1) });
    save(db);
    return result === null || result === undefined ? null : structuredClone(result);
  }
  return fail(404, "Route inconnue");
}

const readFile = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });

/** Envoi de photo simulé : l'image est conservée en data URL dans le navigateur. */
export async function mockUpload(path, form, token) {
  await new Promise((r) => setTimeout(r, 150));
  const db = load();
  const user = authUser(db, token);
  if (path === "/organizer/logo") {
    if (!user || user.role !== "ORGANISATEUR") fail(403, "Acces refuse");
    const u = db.users.find((x) => x.id === user.id);
    u.logoData = await readFile(form.get("file")); u.hasLogo = true; u.logoUpdatedAt = iso(now());
    save(db);
    return pub(u);
  }
  const match = path.match(/^\/events\/([^/]+)\/image$/);
  const e = match && db.events.find((x) => x.id === match[1]);
  if (!e) fail(404, "Evenement introuvable");
  if (!user || (user.role !== "ADMIN" && user.id !== e.organizerId)) fail(403, "Acces refuse");
  const file = form.get("file");
  e.image = await readFile(file);
  save(db);
  return view(db, e, user);
}
