import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { authentifier, valider } from "../middleware.js";
import { schemaConnexion, schemaDeconnexion, schemaInscription } from "../schemas.js";

const router = Router();

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
router.post("/logout",
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
router.post("/login", valider(schemaConnexion), async (req, res) => {
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
router.post("/register", valider(schemaInscription), async (req, res) => {
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
    const hotelIdCompte = role === "hotelier" ? hotel_id ?? null : null;

    if (hotelIdCompte != null) {
      const hotel = await prisma.hotel.findUnique({
        where: { hotel_id: hotelIdCompte },
        select: { hotel_id: true },
      });
      if (!hotel) {
        return res
          .status(400)
          .json({ erreur: "hotel_id ne correspond à aucun hôtel" });
      }
    }

    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        role,
        email,
        mot_de_passe: motDePasseHache,
        nom,
        prenom,
        telephone: telephone ?? null,
        hotel_id: hotelIdCompte,
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

export default router;
