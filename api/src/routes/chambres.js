import { Router } from "express";
import { prisma } from "../prisma.js";
import { authentifier, exigeRole, valider } from "../middleware.js";
import {
  schemaChambre,
  schemaFiltresChambres,
  schemaModifChambre,
} from "../schemas.js";

const router = Router();

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
router.get("/:id", async (req, res) => {
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
router.get("/", async (req, res) => {
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
 * /chambres:
 *   post:
 *     tags: [Chambres]
 *     summary: Créer une chambre dans l'hôtel de l'hôtelier connecté
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hotel_id, numero, categorie, capacite, prix_nuit]
 *             properties:
 *               hotel_id: { type: integer }
 *               numero: { type: integer }
 *               categorie: { type: string }
 *               capacite: { type: integer }
 *               prix_nuit: { type: number }
 *               description: { type: string }
 *               disponible: { type: boolean }
 *     responses:
 *       201:
 *         description: Chambre créée
 *       401:
 *         description: Jeton absent ou invalide
 *       403:
 *         description: L'hôtelier ne peut créer que dans son hôtel
 */
router.post("/",
  authentifier,
  exigeRole("hotelier"),
  valider(schemaChambre),
  async (req, res) => {
    if (req.body.hotel_id !== req.user.hotelId) {
      return res.status(403).json({ erreur: "acces refuse" });
    }

    try {
      const chambre = await prisma.chambre.create({
        data: {
          ...req.body,
          numero: String(req.body.numero),
        },
      });
      res.status(201).json(chambre);
    } catch (erreur) {
      console.error("Erreur lors de la création de la chambre :", erreur);
      res.status(500).json({ erreur: "erreur serveur" });
    }
  },
);

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
router.patch("/:id",
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
router.delete("/:id",
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

export default router;
