// server.js (à la racine, à côté de package.json)
import "dotenv/config";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.ts";
import jwt from "jsonwebtoken";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import {
  schemaConnexion,
  schemaDeconnexion,
  schemaFiltresChambres,
  schemaInscription,
  schemaModifChambre,
  schemaProfil,
  schemaReservation,
  schemaStatutReservation,
} from "./schemas.js";

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "Finder API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErreurValidation: {
          type: "object",
          properties: {
            erreur: { type: "string", example: "donnees invalides" },
            details: {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
          },
        },
        CorpsConnexion: {
          type: "object",
          required: ["email", "mot_de_passe"],
          properties: {
            email: { type: "string", format: "email" },
            mot_de_passe: { type: "string" },
          },
        },
        CorpsInscription: {
          type: "object",
          required: ["email", "mot_de_passe", "nom", "prenom"],
          properties: {
            role: { type: "string", default: "voyageur" },
            email: { type: "string", format: "email" },
            mot_de_passe: { type: "string", minLength: 1 },
            nom: { type: "string", minLength: 1 },
            prenom: { type: "string", minLength: 1 },
            telephone: { type: "string" },
            hotel_id: { type: "integer", nullable: true },
          },
        },
        CorpsReservation: {
          type: "object",
          required: [
            "chambre_id",
            "date_arrivee",
            "date_depart",
            "nb_personnes",
          ],
          properties: {
            chambre_id: { type: "integer", minimum: 1 },
            date_arrivee: { type: "string", format: "date" },
            date_depart: { type: "string", format: "date" },
            nb_personnes: { type: "integer", minimum: 1 },
            demande_speciale: { type: "string" },
          },
        },
        CorpsStatutReservation: {
          type: "object",
          required: ["statut"],
          properties: {
            statut: { type: "string", enum: ["confirmee", "refusee"] },
          },
        },
        CorpsModificationChambre: {
          type: "object",
          properties: {
            numero: { type: "integer" },
            categorie: { type: "string" },
            capacite: { type: "integer", minimum: 1 },
            prix_nuit: { type: "number", minimum: 0 },
            description: { type: "string" },
            disponible: { type: "boolean" },
          },
        },
        CorpsModificationProfil: {
          type: "object",
          properties: {
            nom: { type: "string", minLength: 1 },
            prenom: { type: "string", minLength: 1 },
            telephone: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/**/*.js"],
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
const PORT = process.env.PORT ?? 3000;

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Systeme]
 *     summary: Vérifier que l'API fonctionne
 *     responses:
 *       200:
 *         description: API opérationnelle
 */

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
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ erreur: "acces refuse" });
}

function valider(schema) {
  return (req, res, next) => {
    const resultat = schema.safeParse(req.body ?? {});
    if (!resultat.success) {
      return res.status(400).json({
        erreur: "donnees invalides",
        details: resultat.error.issues,
      });
    }

    req.body = resultat.data;
    next();
  };
}

const TRANSITIONS_AUTORISEES = {
  en_attente: ["confirmee", "refusee", "annulee"],
  confirmee: ["annulee"],
  refusee: [],
  annulee: [],
};

function transitionValide(statutActuel, statutVoulu) {
  return (TRANSITIONS_AUTORISEES[statutActuel] || []).includes(statutVoulu);
}

/**
 * @openapi
 * /reservations:
 *   post:
 *     tags: [Reservations]
 *     summary: Créer une réservation pour le voyageur connecté
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsReservation'
 *     responses:
 *       201:
 *         description: Réservation créée au statut en_attente
 *       400:
 *         description: Corps invalide
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas un voyageur
 *       500:
 *         description: Erreur serveur
 */
app.post(
  "/reservations",
  authentifier,
  exigeRole("voyageur"),
  valider(schemaReservation),
  async (req, res) => {
    const {
      chambre_id,
      date_arrivee,
      date_depart,
      nb_personnes,
      demande_speciale,
    } = req.body;

    try {
      const reservation = await prisma.reservation.create({
        data: {
          voyageur_id: req.user.userId,
          chambre_id,
          date_arrivee: new Date(date_arrivee),
          date_depart: new Date(date_depart),
          nb_personnes,
          statut: "en_attente",
          demande_speciale: demande_speciale ?? "",
        },
      });
      res.status(201).json(reservation);
    } catch (erreur) {
      console.error("Erreur lors de la création de la réservation :", erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /reservations/mine:
 *   get:
 *     tags: [Reservations]
 *     summary: Lister les réservations du voyageur connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tableau des réservations avec leur chambre
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas un voyageur
 *       500:
 *         description: Erreur serveur
 */
app.get(
  "/reservations/mine",
  authentifier,
  exigeRole("voyageur"),
  async (req, res) => {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { voyageur_id: req.user.userId },
        include: { chambre: true },
      });
      res.json(reservations);
    } catch (erreur) {
      console.error(
        "Erreur lors de la récupération des réservations du voyageur :",
        erreur,
      );
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /reservations/received:
 *   get:
 *     tags: [Reservations]
 *     summary: Lister les réservations reçues par l'hôtelier connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tableau des réservations de l'hôtel, avec chambre et voyageur
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas un hôtelier
 *       500:
 *         description: Erreur serveur
 */
app.get(
  "/reservations/received",
  authentifier,
  exigeRole("hotelier"),
  async (req, res) => {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { chambre: { hotel_id: req.user.hotelId } },
        include: {
          chambre: true,
          voyageur: {
            select: {
              utilisateur_id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
            },
          },
        },
      });
      res.json(reservations);
    } catch (erreur) {
      console.error(
        "Erreur lors de la récupération des réservations de l'hôtel :",
        erreur,
      );
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /reservations/{id}:
 *   patch:
 *     tags: [Reservations]
 *     summary: Confirmer ou refuser une réservation de son hôtel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsStatutReservation'
 *     responses:
 *       200:
 *         description: Statut de la réservation mis à jour
 *       400:
 *         description: Identifiant ou corps invalide
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas l'hôtelier propriétaire de la chambre
 *       404:
 *         description: Réservation introuvable
 *       409:
 *         description: Transition de statut interdite
 *       500:
 *         description: Erreur serveur
 */
app.patch(
  "/reservations/:id",
  authentifier,
  exigeRole("hotelier"),
  valider(schemaStatutReservation),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erreur: "id invalide" });
    }

    try {
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: id },
        include: { chambre: { select: { hotel_id: true } } },
      });

      if (!reservation) {
        return res.status(404).json({ erreur: "reservation introuvable" });
      }

      if (reservation.chambre.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ erreur: "acces refuse" });
      }

      if (!transitionValide(reservation.statut, req.body.statut)) {
        return res.status(409).json({
          erreur: `passage de ${reservation.statut} a ${req.body.statut} interdit`,
        });
      }

      const reservationModifiee = await prisma.reservation.update({
        where: { reservation_id: id },
        data: { statut: req.body.statut },
      });
      res.json(reservationModifiee);
    } catch (erreur) {
      console.error(
        "Erreur lors de la mise à jour de la réservation :",
        erreur,
      );
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /reservations/{id}:
 *   delete:
 *     tags: [Reservations]
 *     summary: Annuler une réservation appartenant au voyageur connecté
 *     description: Passe le statut à annulee sans supprimer la réservation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Réservation annulée
 *       400:
 *         description: Identifiant invalide
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas le voyageur propriétaire
 *       404:
 *         description: Réservation introuvable
 *       409:
 *         description: Transition vers annulee interdite
 *       500:
 *         description: Erreur serveur
 */
app.delete(
  "/reservations/:id",
  authentifier,
  exigeRole("voyageur"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erreur: "id invalide" });
    }

    try {
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: id },
      });

      if (!reservation) {
        return res.status(404).json({ erreur: "reservation introuvable" });
      }

      if (reservation.voyageur_id !== req.user.userId) {
        return res.status(403).json({ erreur: "acces refuse" });
      }

      if (!transitionValide(reservation.statut, "annulee")) {
        return res.status(409).json({
          erreur: `passage de ${reservation.statut} a annulee interdit`,
        });
      }

      const reservationAnnulee = await prisma.reservation.update({
        where: { reservation_id: id },
        data: { statut: "annulee" },
      });
      res.json(reservationAnnulee);
    } catch (erreur) {
      console.error("Erreur lors de l'annulation de la réservation :", erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentification]
 *     summary: Fermer la session authentifiée
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Session fermée
 *       401:
 *         description: Jeton absent ou invalide
 */
app.post(
  "/auth/logout",
  authentifier,
  valider(schemaDeconnexion),
  (_req, res) => res.status(204).end(),
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentification]
 *     summary: Se connecter et obtenir un jeton JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsConnexion'
 *     responses:
 *       200:
 *         description: Connexion réussie, jeton retourné
 *       400:
 *         description: Corps invalide
 *       401:
 *         description: Identifiants invalides
 */
app.post("/auth/login", valider(schemaConnexion), async (req, res) => {
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

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentification]
 *     summary: Créer un compte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsInscription'
 *     responses:
 *       201:
 *         description: Compte créé
 *       400:
 *         description: Corps invalide ou champs obligatoires absents
 *       409:
 *         description: Adresse email déjà utilisée
 *       500:
 *         description: Erreur serveur
 */
app.post("/auth/register", valider(schemaInscription), async (req, res) => {
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

/**
 * @openapi
 * /chambres/{id}:
 *   get:
 *     tags: [Chambres]
 *     summary: Récupérer une chambre par son identifiant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chambre trouvée
 *       404:
 *         description: Identifiant invalide ou chambre introuvable
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @openapi
 * /hotels:
 *   get:
 *     tags: [Hotels]
 *     summary: Lister les hôtels
 *     responses:
 *       200:
 *         description: Tableau des hôtels
 *       500:
 *         description: Erreur serveur
 */
app.get("/hotels", async (_req, res) => {
  try {
    const hotels = await prisma.hotel.findMany();
    res.json(hotelS);
  } catch (erreur) {
    console.error("Erreur lors de la récupération des hôtels :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

/**
 * @openapi
 * /hotels/{id}/chambres:
 *   get:
 *     tags: [Hotels, Chambres]
 *     summary: Lister les chambres d'un hôtel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tableau des chambres de l'hôtel
 *       404:
 *         description: Identifiant invalide ou hôtel introuvable
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @openapi
 * /hotels/{id}:
 *   get:
 *     tags: [Hotels]
 *     summary: Récupérer un hôtel par son identifiant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hôtel trouvé
 *       404:
 *         description: Identifiant invalide ou hôtel introuvable
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @openapi
 * /chambres:
 *   get:
 *     tags: [Chambres]
 *     summary: Rechercher des chambres selon des critères facultatifs
 *     parameters:
 *       - in: query
 *         name: hotel_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *           enum: [simple, double, familiale, suite]
 *       - in: query
 *         name: capacite
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: prix_max
 *         schema:
 *           type: number
 *           minimum: 0
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Tableau des chambres correspondant aux critères
 *       400:
 *         description: Critère invalide ou dates incohérentes
 *       500:
 *         description: Erreur serveur
 */
app.get("/chambres", async (req, res) => {
  const validationFiltres = schemaFiltresChambres.safeParse(req.query);
  if (!validationFiltres.success) {
    return res.status(400).json({
      erreur: "donnees invalides",
      details: validationFiltres.error.issues,
    });
  }

  const hotel_id = Number(req.query.hotel_id);
  const { capacite, prix_max, categorie } = validationFiltres.data;
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
    if (capacite !== undefined) filtre.capacite = { gte: capacite };
    if (prix_max !== undefined) filtre.prix_nuit = { lte: prix_max };
    if (categorie !== undefined) filtre.categorie = categorie;
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

/**
 * @openapi
 * /chambres/{id}:
 *   patch:
 *     tags: [Chambres]
 *     summary: Modifier une chambre de son hôtel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsModificationChambre'
 *     responses:
 *       200:
 *         description: Chambre modifiée
 *       400:
 *         description: Identifiant ou corps invalide
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas l'hôtelier propriétaire de la chambre
 *       404:
 *         description: Chambre introuvable
 *       500:
 *         description: Erreur serveur
 */
app.patch(
  "/chambres/:id",
  authentifier,
  exigeRole("hotelier"),
  valider(schemaModifChambre),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ erreur: "id invalide" });
    }

    try {
      const chambre = await prisma.chambre.findUnique({
        where: { chambre_id: id },
      });

      if (!chambre) {
        return res.status(404).json({ erreur: "chambre introuvable" });
      }

      if (chambre.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ erreur: "acces refuse" });
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

/**
 * @openapi
 * /chambres/{id}:
 *   delete:
 *     tags: [Chambres]
 *     summary: Supprimer une chambre de son hôtel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Chambre supprimée
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas l'hôtelier propriétaire de la chambre
 *       404:
 *         description: Chambre introuvable ou identifiant invalide
 *       500:
 *         description: Erreur serveur
 */
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
      const chambre = await prisma.chambre.findUnique({
        where: { chambre_id: chambreId },
        select: { chambre_id: true, hotel_id: true },
      });
      if (!chambre) {
        return res.status(404).json({ erreur: "chambre introuvable" });
      }

      if (chambre.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ erreur: "acces refuse" });
      }

      await prisma.chambre.delete({ where: { chambre_id: chambreId } });
      res.status(204).end();
    } catch (erreur) {
      console.error(erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

/**
 * @openapi
 * /adherents/me:
 *   get:
 *     tags: [Voyageurs]
 *     summary: Récupérer le profil du voyageur connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil du voyageur
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas un voyageur
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @openapi
 * /voyageurs/me:
 *   patch:
 *     tags: [Voyageurs]
 *     summary: Modifier le profil du voyageur connecté
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorpsModificationProfil'
 *     responses:
 *       200:
 *         description: Profil modifié
 *       400:
 *         description: Corps invalide
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: Le compte n'est pas un voyageur
 *       500:
 *         description: Erreur serveur
 */
app.patch(
  "/voyageurs/me",
  authentifier,
  exigeRole("voyageur"),
  valider(schemaProfil),
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
