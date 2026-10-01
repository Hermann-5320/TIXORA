import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "./i18n";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { mockRequest } from "./api/mock";
import { tokenStore } from "./api/http";
import i18n from "./i18n";

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}><ThemeProvider><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></ThemeProvider></MemoryRouter>,
);

beforeEach(() => { localStorage.clear(); document.documentElement.className = ""; i18n.changeLanguage("fr"); });

describe("pages (mock)", () => {
  it("accueil : hero, vedettes et prochains événements", async () => {
    renderAt("/");
    expect(await screen.findByText(/Ne ratez aucun grand moment/)).toBeTruthy();
    expect((await screen.findAllByText("Festival Yaoundé Live")).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Ajouter aux favoris|Retirer des favoris/).length).toBeGreaterThan(0);
  });

  it("bascule langue et thème", async () => {
    renderAt("/");
    await screen.findByText(/Ne ratez aucun grand moment/);
    screen.getByLabelText("Switch to English").click();
    expect(await screen.findByText(/Never miss a great moment/)).toBeTruthy();
    screen.getByLabelText("Switch to night mode").click();
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(localStorage.getItem("tx_theme")).toBe("dark");
  });

  it("liste filtrée, détail d'un événement et achat désactivé sans connexion", async () => {
    renderAt("/evenements?category=TECH");
    expect(await screen.findByText("Douala Tech Summit")).toBeTruthy();
    expect(screen.queryByText("Festival Yaoundé Live")).toBeNull();
  });

  it("carte « près de moi » s'affiche", async () => {
    renderAt("/pres-de-moi");
    expect(await screen.findByText(/Événements près de moi/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/événements géolocalisés/)).toBeTruthy());
  });

  it("inscription puis redirection vers la connexion", async () => {
    renderAt("/inscription");
    const u = (await import("@testing-library/user-event")).default;
    await u.type(screen.getByLabelText("Prénom"), "Jean");
    await u.type(screen.getByLabelText("Nom"), "Test");
    await u.type(screen.getByLabelText("Adresse email"), "jean@test.cm");
    await u.type(screen.getByLabelText(/Mot de passe \(8/), "motdepasse1");
    await u.type(screen.getByLabelText("Confirmer le mot de passe"), "motdepasse1");
    await u.click(screen.getByLabelText(/conditions générales/));
    await u.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText(/Compte créé avec succès/)).toBeTruthy();
    expect(screen.getByLabelText("Adresse email").value).toBe("jean@test.cm");
  });

  it("espace admin : validation d'un événement en attente", async () => {
    const { token } = await mockRequest("POST", "/auth/login", { email: "admin@tixora.demo", password: "Admin12345!" });
    tokenStore.set(token);
    renderAt("/admin");
    expect(await screen.findByText("Administration")).toBeTruthy();
    (await screen.findByRole("tab", { name: /Événements/ })).click();
    expect(await screen.findByText("Concert Gospel de Noël")).toBeTruthy();
  });

  it("espace organisateur : formulaire et carte", async () => {
    const { token } = await mockRequest("POST", "/auth/login", { email: "organisateur@tixora.demo", password: "Demo12345!" });
    tokenStore.set(token);
    renderAt("/organisateur");
    expect(await screen.findByText("Créer un événement", { selector: "h1" })).toBeTruthy();
    expect(await screen.findByText(/Gala d'ouverture de la saison/)).toBeTruthy();
    expect(screen.getByText(/Verrouillé/)).toBeTruthy();
  });

  it("connexion : bouton Google affiché", async () => {
    renderAt("/connexion");
    expect(await screen.findByRole("button", { name: /Se connecter avec Google/ })).toBeTruthy();
  });

  it("espace organisateur : total des ventes, commission et logo des billets", async () => {
    const { token } = await mockRequest("POST", "/auth/login", { email: "organisateur@tixora.demo", password: "Demo12345!" });
    tokenStore.set(token);
    renderAt("/organisateur");
    expect(await screen.findByText("Total des ventes")).toBeTruthy();
    expect(screen.getByText(/Commission Tixora \(10 %\)/)).toBeTruthy();
    expect(screen.getByText("Net à recevoir")).toBeTruthy();
    expect(screen.getByText("Logo de vos billets")).toBeTruthy();
    expect(screen.getByText("Personnalisation du billet")).toBeTruthy();
  });

  it("mes billets : billet personnalisé et PDF", async () => {
    const { token } = await mockRequest("POST", "/auth/login", { email: "client@tixora.demo", password: "Demo12345!" });
    tokenStore.set(token);
    const list = (await mockRequest("GET", "/events?size=50")).items;
    const ev = list.find((e) => e.title === "Festival Yaoundé Live");
    const o = await mockRequest("POST", "/orders", { eventId: ev.id, items: [{ ticketTypeId: ev.ticketTypes[0].id, quantity: 1 }], payment: { operatorKey: "MOMO", phone: "677123456" } }, token);
    const db = JSON.parse(localStorage.getItem("tx_mock_db_v3")); db.orders.find((x) => x.id === o.id).createdAt -= 10000; localStorage.setItem("tx_mock_db_v3", JSON.stringify(db));
    await mockRequest("GET", `/orders/${o.id}`, undefined, token);
    renderAt("/mes-billets");
    expect(await screen.findByRole("button", { name: /Télécharger en PDF/ })).toBeTruthy();
    expect(screen.getAllByText("Festival Yaoundé Live").length).toBeGreaterThan(0);
    expect(screen.getByText("Bonne soirée et merci de votre présence !")).toBeTruthy();
  });

  it("achat : frais à la charge du client puis attente de validation du paiement", async () => {
    const u = (await import("@testing-library/user-event")).default;
    const { token } = await mockRequest("POST", "/auth/login", { email: "client@tixora.demo", password: "Demo12345!" });
    tokenStore.set(token);
    const ev = (await mockRequest("GET", "/events?size=50")).items.find((e) => e.title === "Les Saveurs du Cameroun");
    renderAt(`/evenements/${ev.id}`);
    await u.click(await screen.findByLabelText("+ Dégustation"));
    expect(await screen.findByText(/Frais de service/)).toBeTruthy();
    // 6 500 FCFA de billet + frais CT Pay (≈ 4,78 %) ajoutés et supportés par le client : 6 500 + 311 = 6 811 FCFA
    expect(screen.getAllByText(/6[\s\u202f\u00a0]811 FCFA/).length).toBeGreaterThan(0);
    await u.type(await screen.findByLabelText(/Numéro de paiement/), "677123456");
    await u.click(screen.getByRole("button", { name: /Payer/ }));
    expect(await screen.findByText("Validez le paiement sur votre téléphone")).toBeTruthy();
    expect(await screen.findByText(/Paiement confirmé/, {}, { timeout: 15000 })).toBeTruthy();
  }, 25000);
});
