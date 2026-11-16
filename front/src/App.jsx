import { useState } from "react";
import FicheChambre from "./composants/FicheChambre";
import ListeChambres from "./composants/ListeChambres";
import "./App.css";

const hotel = {
  nom: "Amor",
  adresse: "14 quai des Pêcheurs",
  codePostal: "17000",
  ville: "La Rochelle",
};

const chambresInitiales = [
  {
    id: 1,
    hotelId: 1,
    numero: "101",
    categorie: "simple",
    capacite: 1,
    prixNuit: 69,
    description: "Lit simple, douche, bureau.",
    disponible: true,
  },
  {
    id: 2,
    hotelId: 1,
    numero: "102",
    categorie: "simple",
    capacite: 1,
    prixNuit: 69,
    description: "Lit simple, douche, bureau.",
    disponible: true,
  },
  {
    id: 3,
    hotelId: 1,
    numero: "103",
    categorie: "simple",
    capacite: 1,
    prixNuit: 69,
    description: "Lit simple, douche, bureau.",
    disponible: true,
  },
  {
    id: 4,
    hotelId: 1,
    numero: "104",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 5,
    hotelId: 1,
    numero: "105",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 6,
    hotelId: 1,
    numero: "206",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 7,
    hotelId: 1,
    numero: "207",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 8,
    hotelId: 1,
    numero: "208",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 9,
    hotelId: 1,
    numero: "209",
    categorie: "double",
    capacite: 2,
    prixNuit: 95,
    description: "Lit double, salle de bain, télévision.",
    disponible: true,
  },
  {
    id: 10,
    hotelId: 1,
    numero: "210",
    categorie: "familiale",
    capacite: 4,
    prixNuit: 149,
    description: "Deux chambres communicantes, salle de bain, coin salon.",
    disponible: true,
  },
  {
    id: 11,
    hotelId: 1,
    numero: "211",
    categorie: "familiale",
    capacite: 4,
    prixNuit: 149,
    description: "Deux chambres communicantes, salle de bain, coin salon.",
    disponible: true,
  },
  {
    id: 12,
    hotelId: 1,
    numero: "212",
    categorie: "suite",
    capacite: 2,
    prixNuit: 189,
    description: "Grand lit, baignoire, salon séparé, vue dégagée.",
    disponible: true,
  },
];

export default function App() {
  const [chambres] = useState(chambresInitiales);
  const [chambreSelectionnee, setChambreSelectionnee] = useState(null);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="hotel-brand">
          <span className="hotel-monogram" aria-hidden="true">
            A
          </span>
          <span>
            <strong>{hotel.nom}</strong>
            <small>Maison de charme</small>
          </span>
        </div>
        <div className="hotel-location">
          <span className="location-dot" aria-hidden="true" />
          {hotel.ville}
        </div>
      </header>

      <section className="page-intro">
        <p className="eyebrow">VOTRE SÉJOUR À LA ROCHELLE</p>
        <h1>
          Trouvez la chambre
          <br />
          <span>qui vous ressemble.</span>
        </h1>
        <p className="intro-copy">
          Découvrez nos chambres et choisissez votre espace de détente.
        </p>
      </section>

      <main
        className={`booking-layout${chambreSelectionnee ? " has-selection" : ""}`}
      >
        <section className="chambres-panel">
          <header className="panel-heading">
            <div>
              <p className="eyebrow">FAITES VOTRE CHOIX</p>
              <h2>Nos chambres</h2>
            </div>
            {chambres.length > 0 && (
              <span className="room-count">
                {chambres.length} {chambres.length === 1 ? "chambre" : "chambres"}
              </span>
            )}
          </header>
          <ListeChambres
            chambres={chambres}
            chambreSelectionnee={chambreSelectionnee}
            onChoix={setChambreSelectionnee}
          />
        </section>
        {chambreSelectionnee && (
          <FicheChambre
            chambre={chambreSelectionnee}
            hotel={hotel}
            onFermer={() => setChambreSelectionnee(null)}
          />
        )}
      </main>

      <footer className="page-footer">
        Les tarifs sont indiqués par nuit et par chambre.
      </footer>
    </div>
  );
}
