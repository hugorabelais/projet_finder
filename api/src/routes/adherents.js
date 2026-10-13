import { Router } from "express";
import { prisma } from "../prisma.js";
import { authentifier, exigeRole } from "../middleware.js";

const router = Router();

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
router.get("/me", authentifier, exigeRole("voyageur"), async (req, res) => {
  try {
    const moi = await prisma.utilisateur.findUnique({
      where: { utilisateur_id: req.user.userId },
      select: { email: true, nom: true, telephone: true },
    });
    res.json(moi);
  } catch (erreur) {
    console.error("Erreur lors de la récupération du profil :", erreur);
    res.status(500).json({ erreur: "erreur serveur" });
  }
});

export default router;
