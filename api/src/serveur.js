// server.js (à la racine, à côté de package.json)
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3000;
const hotels = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, "..", "finder-data", "hotels.json"),
    "utf8",
  ),
);

const chambres = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, "..", "finder-data", "chambres.json"),
    "utf8",
  ),
);

app.get("/chambres/:id", (req, res) => {
  const id = Number(req.params.id);
  const chambre = chambres.find((l) => l.id === id);
  if (!chambre) return res.status(404).json({ erreur: "chambre introuvable" });
  res.json(chambre);
});

app.get("/hotels", (req, res) => res.json(hotels));

app.get("/hotels/:id", (req, res) => {
  const id = Number(req.params.id);
  const hotel = hotels.find((hotels) => hotels.id === id);
  if (!hotel) return res.status(404).json({ erreur: "hotel introuvable" });
  res.json(hotel);
});

app.get("/chambres", (req, res) => {
  const prix_max = Number(req.query.prix_max);
  const chambre = chambres.filter((l) => l.prix_nuit <= prix_max);
  if (isNaN(prix_max)) {
    res.json(chambres);
  }
  if (!chambre) return res.status(404).json({ erreur: "chambre introuvable" });
  res.json(chambre);
});

app.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
