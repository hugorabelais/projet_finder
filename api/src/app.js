// Application Express pour Finder.
import "dotenv/config";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./prisma.js";
import adherentRoutes from "./routes/adherents.js";
import authRoutes from "./routes/auth.js";
import chambreRoutes from "./routes/chambres.js";
import hotelRoutes from "./routes/hotels.js";
import reservationRoutes from "./routes/reservations.js";
import voyageurRoutes from "./routes/voyageurs.js";

const app = express();
app.use(express.json());

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "Finder API", version: "1.0.0" },
    servers: [{ url: "/" }],
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
            role: {
              type: "string",
              default: "voyageur",
              description: "voyageur ou hotelier",
            },
            email: { type: "string", format: "email" },
            mot_de_passe: { type: "string", minLength: 1 },
            nom: { type: "string", minLength: 1 },
            prenom: { type: "string", minLength: 1 },
            telephone: { type: "string" },
            hotel_id: {
              type: "integer",
              nullable: true,
              description: "À renseigner uniquement pour un hôtelier.",
            },
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

app.use("/auth", authRoutes);
app.use("/chambres", chambreRoutes);
app.use("/hotels", hotelRoutes);
app.use("/adherents", adherentRoutes);
app.use("/reservations", reservationRoutes);
app.use("/voyageurs", voyageurRoutes);

export { prisma };
export default app;
