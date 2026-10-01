import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { http } from "../api/http";
import EventCard from "../components/EventCard";
import { EmptyState, ErrorText, EventGridSkeleton } from "../components/ui";

export default function Favorites() {
  const { t } = useTranslation();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { http.get("/events/favorites").then(setEvents).catch((e) => { setError(e.message); setEvents([]); }); }, []);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{t("favorites.title")}</h1>
        <p className="text-muted">{t("favorites.subtitle")}</p>
      </header>
      <ErrorText>{error}</ErrorText>
      {events === null ? <EventGridSkeleton count={3} /> : events.length === 0 ? (
        <EmptyState icon="💜" title={t("favorites.empty")}><Link to="/evenements" className="font-semibold text-brand">{t("favorites.emptyCta")}</Link></EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{events.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
      )}
    </>
  );
}
