import { Router } from "express";
import { prisma } from "../prisma.js";
import { authentifier, exigeRole, valider } from "../middleware.js";
import { schemaReservation, schemaStatutReservation } from "../schemas.js";

const router = Router();

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
router.post("/",
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
router.get("/mine",
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
router.get("/received",
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
router.patch("/:id",
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
router.delete("/:id",
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

export default router;
