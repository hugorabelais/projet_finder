import "dotenv/config";
import bcrypt from "bcrypt";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient();
const DATA_DIR = path.join(import.meta.dirname, "..", "finder-data");

const lire = (fichier) =>
  JSON.parse(readFileSync(path.join(DATA_DIR, fichier), "utf8"));

const hasherMotDePasse = async (motDePasse) => {
  return bcrypt.hash(motDePasse, 10);
};

async function main() {
  const hotels = lire("hotels.json");
  const chambres = lire("chambres.json");
  const comptes = lire("comptes.json");
  const reservations = lire("reservations.json");

  await prisma.reservation.deleteMany();
  await prisma.chambre.deleteMany();
  await prisma.utilisateur.deleteMany();
  await prisma.hotel.deleteMany();

  await prisma.hotel.createMany({
    data: hotels.map((hotel) => ({
      hotel_id: hotel.id,
      nom: hotel.nom,
      etoiles: hotel.etoiles,
      adresse: hotel.adresse,
      code_postal: hotel.code_postal,
      ville: hotel.ville,
      telephone: hotel.telephone,
      email: hotel.email,
      gerant: hotel.gerant,
      description: hotel.description,
    })),
  });

  await prisma.chambre.createMany({
    data: chambres.map((chambre) => ({
      chambre_id: chambre.id,
      hotel_id: chambre.hotel_id,
      numero: chambre.numero,
      categorie: chambre.categorie,
      capacite: chambre.capacite,
      prix_nuit: chambre.prix_nuit,
      description: chambre.description,
      disponible: chambre.disponible,
    })),
  });

  const utilisateurs = await Promise.all(
    comptes.map(async (compte) => ({
      utilisateur_id: compte.id,
      role: compte.role,
      email: compte.email,
      mot_de_passe: await hasherMotDePasse(compte.mot_de_passe_clair),
      nom: compte.nom,
      prenom: compte.prenom,
      telephone: compte.telephone ?? null,
      hotel_id: compte.hotel_id ?? null,
    })),
  );
  await prisma.utilisateur.createMany({ data: utilisateurs });

  await prisma.reservation.createMany({
    data: reservations.map((reservation) => ({
      reservation_id: reservation.id,
      voyageur_id: reservation.voyageur_id,
      chambre_id: reservation.chambre_id,
      date_arrivee: new Date(reservation.date_arrivee),
      date_depart: new Date(reservation.date_depart),
      nb_personnes: reservation.nb_personnes,
      statut: reservation.statut,
      demande_speciale: reservation.demande_speciale ?? "",
    })),
  });

  console.log(
    `${hotels.length} hôtels, ${chambres.length} chambres, ` +
      `${comptes.length} utilisateurs, ${reservations.length} réservations`,
  );
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
