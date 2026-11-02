export default function Fichehotel({ hotel }) {
  return (
    <article>
      <h2>{hotel.nom}</h2>
      <p>{hotel.adresse},</p>
      <p>
        {hotel.codePostal}, {hotel.ville}
      </p>
    </article>
  );
}
