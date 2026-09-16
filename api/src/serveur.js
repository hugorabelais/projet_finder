// server.js (à la racine, à côté de package.json)
import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.ts";

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3000;

app.get("/chambres/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ erreur: "chambre introuvable" });
  }

  try {
    const chambre = await prisma.chambre.findUnique({
      where: { chambre_id: id },
    });
    if (!chambre) {
      return res.status(404).json({ erreur: "chambre introuvable" });
    }
    const { chambre_id, ...donnees } = chambre;
    res.json(chambre);
  } catch (erreur) {
    console.error("Erreur lors de la récupération de la chambre :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

app.get("/hotels", async (_req, res) => {
  try {
    const hotels = await prisma.hotel.findMany();
    res.json(hotelS);
  } catch (erreur) {
    console.error("Erreur lors de la récupération des hôtels :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

app.get("/hotels/:id/chambres", async (req, res) => {
  const hotelId = Number(req.params.id);
  if (!Number.isInteger(hotelId)) {
    return res.status(404).json({ erreur: "hotel introuvable" });
  }

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: hotelId },
      select: { hotel_id: true },
    });
    if (!hotel) {
      return res.status(404).json({ erreur: "hotel introuvable" });
    }

    const chambres = await prisma.chambre.findMany({
      where: { hotel_id: hotelId },
    });
    res.json(chambres);
  } catch (erreur) {
    console.error(
      "Erreur lors de la récupération des chambres de l'hôtel :",
      erreur,
    );
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

app.get("/hotels/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ erreur: "hotel introuvable" });
  }

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { hotel_id: id },
    });
    if (!hotel) {
      return res.status(404).json({ erreur: "hotel introuvable" });
    }
    const { hotel_id, ...donnees } = hotel;
    res.json(hotel);
  } catch (erreur) {
    console.error("Erreur lors de la récupération de l'hôtel :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

app.get("/chambres", async (req, res) => {
  const hotel_id = Number(req.query.hotel_id);
  const capacite = Number(req.query.capacite);
  const prix_max = Number(req.query.prix_max);
  const { categorie } = req.query;

  try {
    const filtre = {};

    if (hotel_id) filtre.hotel_id = { equal: Number(hotel_id) };
    if (capacite) filtre.capacite = { gte: Number(capacite) };
    if (prix_max) filtre.prix_nuit = { lte: Number(prix_max) };
    if (typeof categorie === "string" && categorie.length > 0) {
      filtre.categorie = categorie;
    }

    const chambres = await prisma.chambre.findMany({
      where: filtre,
    });
    res.json(chambres);
  } catch (erreur) {
    console.error("Erreur lors de la récupération des chambres :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

const serveur = app.listen(PORT, () =>
  console.log(`API sur http://localhost:${PORT}`),
);

const fermerServeur = async () => {
  serveur.close();
  await prisma.$disconnect();
};

process.on("SIGINT", fermerServeur);
process.on("SIGTERM", fermerServeur);
