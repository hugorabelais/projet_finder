// server.js (à la racine, à côté de package.json)
import "dotenv/config";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.ts";
import jwt from "jsonwebtoken";

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3000;

function authentifier(req, res, next) {
  const entete = req.headers.authorization || "";
  const token = entete.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: "jeton absent ou invalide" });
  }
}

function exigeRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.utilisateur.role)
      ? next()
      : res.status(403).json({ erreur: "acces refuse" });
}

app.post("/auth/logout", authentifier, (_req, res) => res.status(204).end());

app.post("/auth/login", async (req, res) => {
  const { email, mot_de_passe } = req.body;
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  if (
    !utilisateur ||
    !(await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe))
  ) {
    return res
      .status(401)
      .json({ erreur: "identifiants ou mot de passe invalides" });
  }
  const token = jwt.sign(
    {
      userId: utilisateur.utilisateur_id,
      hotelId: utilisateur.hotel_id,
      role: utilisateur.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );

  res.json({ token });
});

app.post("/auth/register", async (req, res) => {
  const {
    role = "voyageur",
    email,
    mot_de_passe,
    nom,
    prenom,
    telephone,
    hotel_id,
  } = req.body;

  if (
    typeof email !== "string" ||
    typeof mot_de_passe !== "string" ||
    typeof nom !== "string" ||
    typeof prenom !== "string"
  ) {
    return res.status(400).json({
      erreur: "email, mot_de_passe, nom et prenom sont obligatoires",
    });
  }

  try {
    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        role,
        email,
        mot_de_passe: motDePasseHache,
        nom,
        prenom,
        telephone: telephone ?? null,
        hotel_id: hotel_id ?? null,
      },
      select: {
        utilisateur_id: true,
        role: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        date_inscription: true,
        hotel_id: true,
      },
    });

    res.status(201).json(utilisateur);
  } catch (erreur) {
    if (erreur?.code === "P2002") {
      return res.status(409).json({ erreur: "email déjà utilisé" });
    }
    console.error("Erreur lors de l'inscription :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

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
  const date_debut = req.query.date_debut;
  const date_fin = req.query.date_fin;
  const date_arrivee =
    typeof date_debut === "string" ? new Date(date_debut) : null;
  const date_depart = typeof date_fin === "string" ? new Date(date_fin) : null;

  if (date_debut || date_fin) {
    if (
      !date_arrivee ||
      !date_depart ||
      Number.isNaN(date_arrivee.getTime()) ||
      Number.isNaN(date_depart.getTime())
    ) {
      return res.status(400).json({ erreur: "Dates invalides" });
    }

    if (date_arrivee >= date_depart) {
      return res.status(400).json({
        erreur: "date_debut doit être strictement avant date_fin",
      });
    }
  }
  try {
    const filtre = {};

    if (!Number.isNaN(hotel_id)) filtre.hotel_id = hotel_id;
    if (!Number.isNaN(capacite)) filtre.capacite = { gte: capacite };
    if (!Number.isNaN(prix_max)) filtre.prix_nuit = { lte: prix_max };
    if (typeof categorie === "string" && categorie.length > 0) {
      filtre.categorie = categorie;
    }
    if (date_arrivee && date_depart) {
      filtre.reservations = {
        none: {
          statut: "confirmee",
          date_arrivee: { lt: date_depart },
          date_depart: { gt: date_arrivee },
        },
      };
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

app.patch(
  "/chambres/:id",
  authentifier,
  exigeRole("hotelier"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ erreur: "id invalide" });
    }

    try {
      const chambre = await prisma.chambre.findFirst({
        where: {
          chambre_id: id,
          hotel_id: req.user.hotelId,
        },
      });

      if (!chambre) {
        return res.status(404).json({ erreur: "chambre introuvable" });
      }

      const chambreModifiee = await prisma.chambre.update({
        where: {
          chambre_id: id,
        },
        data: req.body,
      });

      res.json(chambreModifiee);
    } catch (erreur) {
      console.error(erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

app.delete(
  "/chambres/:id",
  authentifier,
  exigeRole("hotelier"),
  async (req, res) => {
    const chambreId = Number(req.params.id);
    if (!Number.isInteger(chambreId)) {
      return res.status(404).json({ erreur: "chambre introuvable" });
    }

    try {
      const chambre = await prisma.chambre.findFirst({
        where: { chambre_id: chambreId, hotel_id: req.user.hotelId },
        select: { chambre_id: true },
      });
      if (!chambre) {
        return res.status(404).json({ erreur: "chambre introuvable" });
      }

      await prisma.chambre.delete({ where: { chambre_id: chambreId } });
      res.status(204).end();
    } catch (erreur) {
      console.error(erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

app.get(
  "/adherents/me",
  authentifier,
  exigeRole("voyageur"),
  async (req, res) => {
    const moi = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur.utilisateur_id },
      select: { email: true, nom: true, telephone: true },
    });
    res.json(moi);
  },
);

app.patch(
  "/voyageurs/me",
  authentifier,
  exigeRole("voyageur"),
  async (req, res) => {
    const { nom, prenom, telephone } = req.body;

    try {
      const utilisateur = await prisma.utilisateur.update({
        where: {
          utilisateur_id: req.user.userId,
        },
        data: {
          ...(nom !== undefined && { nom }),
          ...(prenom !== undefined && { prenom }),
          ...(telephone !== undefined && { telephone }),
        },
      });

      res.json(utilisateur);
    } catch (erreur) {
      console.error(erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

const serveur = app.listen(PORT, () => {
  console.log(`API sur http://localhost:${PORT}`);
});

const fermerServeur = async () => {
  serveur.close();
  await prisma.$disconnect();
};

process.on("SIGINT", fermerServeur);
process.on("SIGTERM", fermerServeur);
