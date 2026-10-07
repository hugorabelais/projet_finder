import { z } from "zod";

// Inscription
export const schemaInscription = z.object({
  role: z.string().optional(),
  email: z.string().email("email invalide"),
  mot_de_passe: z.string().min(1, "mot de passe obligatoire"),
  nom: z.string().min(1, "nom obligatoire"),
  prenom: z.string().min(1, "prenom obligatoire"),
  telephone: z.string().optional(),
  hotel_id: z.number().int().nullable().optional(),
});

// Connexion
export const schemaConnexion = z.object({
  email: z.string().email("email invalide"),
  mot_de_passe: z.string().min(1, "mot de passe obligatoire"),
});

export const schemaDeconnexion = z.object({}).strict();

// Création d'une chambre
export const schemaChambre = z.object({
  hotel_id: z.number().int(),
  numero: z.number().int(),
  categorie: z.string().min(1, "categorie obligatoire"),
  capacite: z.number().int().min(1),
  prix_nuit: z.number().min(0),
  description: z.string().optional(),
  disponible: z.boolean().optional(),
});

// Modification d'une chambre
export const schemaModifChambre = schemaChambre
  .partial()
  .extend({ hotel_id: z.never().optional() });

// Modification du profil
export const schemaProfil = z.object({
  nom: z.string().min(1, "nom obligatoire").optional(),
  prenom: z.string().min(1, "prenom obligatoire").optional(),
  telephone: z.string().optional(),
});

const schemaNombreQuery = z
  .string()
  .trim()
  .min(1, "doit être un nombre")
  .refine((valeur) => Number.isFinite(Number(valeur)), "doit être un nombre")
  .transform(Number);

export const schemaFiltresChambres = z.object({
  categorie: z.enum(["simple", "double", "familiale", "suite"]).optional(),
  capacite: schemaNombreQuery.pipe(z.number().int().min(1)).optional(),
  prix_max: schemaNombreQuery.pipe(z.number().min(0)).optional(),
});

export const schemaReservation = z
  .object({
    chambre_id: z.number().int().positive(),
    date_arrivee: z.iso.date(),
    date_depart: z.iso.date(),
    nb_personnes: z.number().int().positive(),
    demande_speciale: z.string().optional(),
  })
  .refine(
    ({ date_arrivee, date_depart }) => date_arrivee < date_depart,
    {
      message: "date_arrivee doit être strictement avant date_depart",
      path: ["date_depart"],
    },
  );

export const schemaStatutReservation = z.object({
  statut: z.enum(["confirmee", "refusee"]),
});
