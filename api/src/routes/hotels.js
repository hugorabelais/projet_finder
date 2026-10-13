import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

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
router.get("/", async (_req, res) => {
  try {
    const hotels = await prisma.hotel.findMany();
    res.json(hotels);
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
router.get("/:id/chambres", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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

export default router;
