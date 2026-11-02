export default function FicheChambre({ hotel, chambre }) {
  return (
    <>
      <article>
        <p>chambre n° {chambre.numero}</p>
        <p>categorie : {chambre.categorie}</p>
        <p>prix : {chambre.prix} euros</p>
        <p>hotel : {hotel.nom}</p>
      </article>
    </>
  );
}
