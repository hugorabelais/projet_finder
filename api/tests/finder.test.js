import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app, { prisma } from "../src/app.js";

const voyageur = {
  email: "a.morel@mail.example",
  mot_de_passe: "Voyage-2026!",
};
const hotelier = {
  email: "ravel@amor.example",
  mot_de_passe: "Amor-2026!",
};

let jetonVoyageur;
let jetonHotelier;
let chambreTemporaireId;

async function obtenirJeton(identifiants) {
  const reponse = await request(app).post("/auth/login").send(identifiants);
  expect(reponse.status).toBe(200);
  return reponse.body.token;
}

async function obtenirJetonVoyageur() {
  jetonVoyageur ??= await obtenirJeton(voyageur);
  return jetonVoyageur;
}

async function obtenirJetonHotelier() {
  jetonHotelier ??= await obtenirJeton(hotelier);
  return jetonHotelier;
}

async function creerChambreTemporaire() {
  const numero = Number(String(Date.now()).slice(-8));
  const reponse = await request(app)
    .post("/chambres")
    .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`)
    .send({
      hotel_id: 1,
      numero,
      categorie: "double",
      capacite: 2,
      prix_nuit: 120,
      description: "Chambre créée par les tests.",
    });

  expect(reponse.status).toBe(201);
  chambreTemporaireId = reponse.body.chambre_id;
  return reponse.body;
}

describe("API Finder", () => {
  afterEach(async () => {
    if (chambreTemporaireId !== undefined) {
      await request(app)
        .delete(`/chambres/${chambreTemporaireId}`)
        .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`);
      chambreTemporaireId = undefined;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("authentifie un compte seedé et retourne un jeton JWT", async () => {
    const reponse = await request(app).post("/auth/login").send(voyageur);

    expect(reponse.status).toBe(200);
    expect(reponse.body.token).toEqual(expect.any(String));
  });

  it("refuse des identifiants invalides", async () => {
    const reponse = await request(app)
      .post("/auth/login")
      .send({ ...voyageur, mot_de_passe: "incorrect" });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toHaveProperty("erreur");
  });

  it("lit une chambre seedée par son identifiant", async () => {
    const reponse = await request(app).get("/chambres/1");

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      chambre_id: 1,
      hotel_id: 1,
      numero: "101",
    });
  });

  it("crée une chambre pour l'hôtel de l'hôtelier connecté", async () => {
    const chambre = await creerChambreTemporaire();

    expect(chambre).toMatchObject({
      hotel_id: 1,
      categorie: "double",
      capacite: 2,
      prix_nuit: 120,
    });
  });

  it("modifie une chambre appartenant à l'hôtelier connecté", async () => {
    const chambre = await creerChambreTemporaire();
    const reponse = await request(app)
      .patch(`/chambres/${chambre.chambre_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`)
      .send({ prix_nuit: 135 });

    expect(reponse.status).toBe(200);
    expect(reponse.body.prix_nuit).toBe(135);
  });

  it("supprime une chambre appartenant à l'hôtelier connecté", async () => {
    const chambre = await creerChambreTemporaire();
    const reponse = await request(app)
      .delete(`/chambres/${chambre.chambre_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`);

    expect(reponse.status).toBe(204);
    chambreTemporaireId = undefined;
    await expect(
      request(app).get(`/chambres/${chambre.chambre_id}`),
    ).resolves.toMatchObject({ status: 404 });
  });

  it("filtre les chambres par catégorie, capacité et prix maximal", async () => {
    const reponse = await request(app).get(
      "/chambres?categorie=suite&capacite=2&prix_max=200",
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body.length).toBeGreaterThan(0);
    expect(
      reponse.body.every(
        (chambre) =>
          chambre.categorie === "suite" &&
          chambre.capacite >= 2 &&
          chambre.prix_nuit <= 200,
      ),
    ).toBe(true);
  });

  it("exclut de la recherche une chambre déjà réservée sur la période", async () => {
    const reponse = await request(app).get(
      "/chambres?date_debut=2026-10-10&date_fin=2026-10-12",
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body.map((chambre) => chambre.chambre_id)).not.toContain(4);
  });

  it("liste les réservations du voyageur connecté", async () => {
    const reponse = await request(app)
      .get("/reservations/mine")
      .set("Authorization", `Bearer ${await obtenirJetonVoyageur()}`);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reservation_id: 1, voyageur_id: 4 }),
      ]),
    );
  });

  it("crée une réservation en attente et permet de l'annuler", async () => {
    const creation = await request(app)
      .post("/reservations")
      .set("Authorization", `Bearer ${await obtenirJetonVoyageur()}`)
      .send({
        chambre_id: 32,
        date_arrivee: "2030-06-01",
        date_depart: "2030-06-03",
        nb_personnes: 2,
      });

    expect(creation.status).toBe(201);
    expect(creation.body.statut).toBe("en_attente");

    const annulation = await request(app)
      .delete(`/reservations/${creation.body.reservation_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonVoyageur()}`);

    expect(annulation.status).toBe(200);
    expect(annulation.body.statut).toBe("annulee");
  });
});
