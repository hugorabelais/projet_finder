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
let reservationTemporaireId;

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

function verifierErreur(reponse, statut) {
  expect(reponse.status).toBe(statut);
  expect(reponse.body).toHaveProperty("erreur");
}

describe("API Finder", () => {
  afterEach(async () => {
    if (chambreTemporaireId !== undefined) {
      await request(app)
        .delete(`/chambres/${chambreTemporaireId}`)
        .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`);
      chambreTemporaireId = undefined;
    }
    if (reservationTemporaireId !== undefined) {
      await prisma.reservation.deleteMany({
        where: { reservation_id: reservationTemporaireId },
      });
      reservationTemporaireId = undefined;
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

    verifierErreur(
      await request(app).post("/auth/login").send({ email: "invalide" }),
      400,
    );
    verifierErreur(await request(app).post("/auth/logout"), 401);
  });

  it("ignore l'identifiant d'hôtel fourni à l'inscription d'un voyageur", async () => {
    verifierErreur(
      await request(app).post("/auth/register").send({ email: "invalide" }),
      400,
    );

    const email = `voyageur-sans-hotel-${Date.now()}@mail.example`;
    const reponse = await request(app)
      .post("/auth/register")
      .send({
        email,
        mot_de_passe: "MotDePasse-2026!",
        nom: "Test",
        prenom: "Voyageur",
        hotel_id: -1,
      });

    expect(reponse.status).toBe(201);
    expect(reponse.body.hotel_id).toBeNull();
    await prisma.utilisateur.deleteMany({ where: { email } });
  });

  it("lit une chambre seedée par son identifiant", async () => {
    const reponse = await request(app).get("/chambres/1");

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      chambre_id: 1,
      hotel_id: 1,
      numero: "101",
    });

    verifierErreur(await request(app).get("/chambres/999999"), 404);
    verifierErreur(await request(app).get("/hotels/999999"), 404);
    verifierErreur(await request(app).get("/hotels/999999/chambres"), 404);
  });

  it("crée une chambre pour l'hôtel de l'hôtelier connecté", async () => {
    verifierErreur(
      await request(app).post("/chambres").send({
        hotel_id: 1,
        numero: 999,
        categorie: "double",
        capacite: 2,
        prix_nuit: 120,
      }),
      401,
    );
    verifierErreur(
      await request(app)
        .post("/chambres")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ numero: 999 }),
      400,
    );
    verifierErreur(
      await request(app)
        .post("/chambres")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({
          hotel_id: 2,
          numero: 999,
          categorie: "double",
          capacite: 2,
          prix_nuit: 120,
        }),
      403,
    );

    const chambre = await creerChambreTemporaire();

    expect(chambre).toMatchObject({
      hotel_id: 1,
      categorie: "double",
      capacite: 2,
      prix_nuit: 120,
    });
  });

  it("modifie une chambre appartenant à l'hôtelier connecté", async () => {
    verifierErreur(
      await request(app).patch("/chambres/1").send({ prix_nuit: 135 }),
      401,
    );
    verifierErreur(
      await request(app)
        .patch("/chambres/1")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ hotel_id: 1 }),
      400,
    );
    verifierErreur(
      await request(app)
        .patch("/chambres/999999")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ prix_nuit: 135 }),
      404,
    );
    verifierErreur(
      await request(app)
        .patch("/chambres/13")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ prix_nuit: 135 }),
      403,
    );

    const chambre = await creerChambreTemporaire();
    const reponse = await request(app)
      .patch(`/chambres/${chambre.chambre_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`)
      .send({ prix_nuit: 135 });

    expect(reponse.status).toBe(200);
    expect(reponse.body.prix_nuit).toBe(135);
  });

  it("supprime une chambre appartenant à l'hôtelier connecté", async () => {
    verifierErreur(
      await request(app).delete("/chambres/1"),
      401,
    );
    verifierErreur(
      await request(app)
        .delete("/chambres/999999")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier()),
      404,
    );
    verifierErreur(
      await request(app)
        .delete("/chambres/13")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier()),
      403,
    );

    const chambre = await creerChambreTemporaire();
    const reponse = await request(app)
      .delete(`/chambres/${chambre.chambre_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonHotelier()}`);

    expect(reponse.status).toBe(204);
    chambreTemporaireId = undefined;
  });

  it("filtre les chambres par critères et exclut celles déjà réservées", async () => {
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

    const chambresSurPeriode = await request(app).get(
      "/chambres?date_debut=2026-10-10&date_fin=2026-10-12",
    );

    expect(chambresSurPeriode.status).toBe(200);
    expect(
      chambresSurPeriode.body.map((chambre) => chambre.chambre_id),
    ).not.toContain(4);
    expect(
      chambresSurPeriode.body.map((chambre) => chambre.chambre_id),
    ).toContain(32);

    const chambresApresLiberation = await request(app).get(
      "/chambres?date_debut=2026-10-11&date_fin=2026-10-13",
    );

    expect(chambresApresLiberation.status).toBe(200);
    expect(
      chambresApresLiberation.body.map((chambre) => chambre.chambre_id),
    ).toContain(4);

    verifierErreur(await request(app).get("/chambres?capacite=invalide"), 400);
  });

  it("liste les réservations du voyageur connecté", async () => {
    verifierErreur(await request(app).get("/reservations/mine"), 401);
    verifierErreur(await request(app).get("/reservations/received"), 401);
    verifierErreur(await request(app).get("/adherents/me"), 401);
    verifierErreur(await request(app).patch("/voyageurs/me").send({ nom: "" }), 401);
    verifierErreur(
      await request(app)
        .patch("/voyageurs/me")
        .set("Authorization", "Bearer " + await obtenirJetonVoyageur())
        .send({ nom: "" }),
      400,
    );

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
    verifierErreur(
      await request(app).post("/reservations").send({ chambre_id: 32 }),
      401,
    );
    verifierErreur(
      await request(app)
        .post("/reservations")
        .set("Authorization", "Bearer " + await obtenirJetonVoyageur())
        .send({ chambre_id: 32 }),
      400,
    );
    verifierErreur(
      await request(app).patch("/reservations/1").send({ statut: "confirmee" }),
      401,
    );
    verifierErreur(
      await request(app)
        .patch("/reservations/1")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ statut: "invalide" }),
      400,
    );
    verifierErreur(
      await request(app).delete("/reservations/1"),
      401,
    );
    verifierErreur(
      await request(app)
        .patch("/reservations/999999")
        .set("Authorization", "Bearer " + await obtenirJetonHotelier())
        .send({ statut: "confirmee" }),
      404,
    );
    verifierErreur(
      await request(app)
        .delete("/reservations/999999")
        .set("Authorization", "Bearer " + await obtenirJetonVoyageur()),
      404,
    );

    const creation = await request(app)
      .post("/reservations")
      .set("Authorization", `Bearer ${await obtenirJetonVoyageur()}`)
      .send({
        chambre_id: 32,
        date_arrivee: "2030-06-01",
        date_depart: "2030-06-03",
        nb_personnes: 2,
      });

    reservationTemporaireId = creation.body.reservation_id;
    expect(creation.status).toBe(201);
    expect(creation.body.statut).toBe("en_attente");

    const annulation = await request(app)
      .delete(`/reservations/${creation.body.reservation_id}`)
      .set("Authorization", `Bearer ${await obtenirJetonVoyageur()}`);

    expect(annulation.status).toBe(200);
    expect(annulation.body.statut).toBe("annulee");
  });
});
