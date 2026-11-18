import { useParams } from "react-router-dom";

export default function Reservation() {
  const { id } = useParams();

  return (
    <section className="simple-page">
      <h1>Réserver</h1>
      <p>Réservation de la chambre {id}.</p>
    </section>
  );
}
