import { useState } from "react";
import { API } from "./config";

import FicheHotel from "./composants/FicheHotel";
import FicheChambre from "./composants/FicheChambre";
const hotel = {
  nom: "fuck brest hotel",
  adresse: "7 le boissy",
  codePostal: "22640",
  ville: "La Malhoure",
  description: "hotel sympa",
};
const chambre = {
  numero: "101",
  categorie: "simple",
  prix: "100",
};
export default function App() {
  return (
    <>
      <FicheHotel hotel={hotel} />
      <FicheChambre chambre={chambre} hotel={hotel} />;
    </>
  );
}
