import { Router } from "express";
import { prisma } from "../prisma.js";
import { authentifier, exigeRole, valider } from "../middleware.js";
import { schemaProfil } from "../schemas.js";

const router = Router();

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
router.patch(
  "/me",
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

export default router;
