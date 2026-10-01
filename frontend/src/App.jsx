import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Pages lourdes (carte Leaflet, scanner, PDF) chargées à la demande.
const Nearby = lazy(() => import("./pages/Nearby"));
const Favorites = lazy(() => import("./pages/Favorites"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const Organizer = lazy(() => import("./pages/Organizer"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Admin = lazy(() => import("./pages/Admin"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/evenements" element={<Events />} />
        <Route path="/evenements/:id" element={<EventDetail />} />
        <Route path="/pres-de-moi" element={<Nearby />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/favoris" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/mes-billets" element={<ProtectedRoute roles={["CLIENT"]}><MyTickets /></ProtectedRoute>} />
        <Route path="/organisateur" element={<ProtectedRoute roles={["ORGANISATEUR"]}><Organizer /></ProtectedRoute>} />
        <Route path="/controle" element={<ProtectedRoute roles={["CONTROLEUR", "ORGANISATEUR"]}><Scanner /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><Admin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
