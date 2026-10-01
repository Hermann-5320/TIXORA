// Catégories d'événements : identifiants partagés avec le backend (Const.CATEGORIES).
export const CATEGORIES = [
  { id: "MUSIQUE", emoji: "🎵", from: "#f97316", to: "#db2777" },
  { id: "SPORT", emoji: "⚽", from: "#16a34a", to: "#0891b2" },
  { id: "CULTURE", emoji: "🎭", from: "#9333ea", to: "#db2777" },
  { id: "TECH", emoji: "💻", from: "#2563eb", to: "#7c3aed" },
  { id: "GASTRONOMIE", emoji: "🍽️", from: "#ea580c", to: "#ca8a04" },
  { id: "BUSINESS", emoji: "💼", from: "#0f766e", to: "#1d4ed8" },
  { id: "GALA", emoji: "🥂", from: "#c026d3", to: "#f59e0b" },
];
export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[2];

// Villes proposées (le filtre du backend compare le nom exact, d'où une liste fermée).
export const CITIES = [
  { name: "Douala", lat: 4.0511, lng: 9.7679 },
  { name: "Yaoundé", lat: 3.848, lng: 11.5021 },
  { name: "Kribi", lat: 2.94, lng: 9.91 },
  { name: "Bafoussam", lat: 5.4737, lng: 10.4179 },
  { name: "Bamenda", lat: 5.9631, lng: 10.1591 },
  { name: "Limbé", lat: 4.0186, lng: 9.2 },
  { name: "Buea", lat: 4.1527, lng: 9.2416 },
  { name: "Garoua", lat: 9.3014, lng: 13.3977 },
  { name: "Maroua", lat: 10.591, lng: 14.3159 },
  { name: "Ngaoundéré", lat: 7.3277, lng: 13.5847 },
  { name: "Bertoua", lat: 4.5773, lng: 13.6846 },
  { name: "Ebolowa", lat: 2.9, lng: 11.15 },
];
export const CAMEROON_CENTER = { lat: 5.6, lng: 12.4, zoom: 6 };
