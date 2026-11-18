import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { API } from "../config";
import { jeton, setJeton } from "../auth";

export default function MesReservations() {
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();
  const { setConnecte } = useOutletContext();

  useEffect(() => {
    let annule = false;

    async function chargerReservations() {
      try {
        const reponse = await fetch(`${API}/reservations/mine`, {
          headers: { Authorization: `Bearer ${jeton()}` },
        });

        if (reponse.status === 401) {
          setJeton(null);
          setConnecte(false);
          navigate("/connexion", { replace: true });
          return;
        }

        const resultat = await reponse.json();
        if (!reponse.ok) {
          throw new Error(
            resultat.erreur ||
              `Le chargement des réservations a échoué (HTTP ${reponse.status}).`,
          );
        }
        if (!Array.isArray(resultat)) {
          throw new Error("La réponse de l’API n’est pas une liste de réservations.");
        }

        if (!annule) setReservations(resultat);
      } catch (erreurChargement) {
        if (!annule) {
          setErreur(
            erreurChargement instanceof TypeError
              ? "Impossible de joindre l’API. Vérifiez que le serveur est démarré."
              : erreurChargement instanceof Error
                ? erreurChargement.message
                : "Le chargement des réservations a échoué.",
          );
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    chargerReservations();
    return () => {
      annule = true;
    };
  }, [navigate, setConnecte]);

  return (
    <section className="simple-page">
      <h1>Mes réservations</h1>
      {chargement ? (
        <p role="status">Chargement de vos réservations…</p>
      ) : erreur ? (
        <p className="form-error" role="alert">
          {erreur}
        </p>
      ) : reservations.length === 0 ? (
        <p>Vous n’avez pas encore de réservation.</p>
      ) : (
        <ul className="reservation-list">
          {reservations.map((reservation) => (
            <li key={reservation.reservation_id}>
              <strong>Chambre n° {reservation.chambre.numero}</strong>
              <span>Hôtel : {reservation.chambre.hotel.nom}</span>
              <span>Statut : {reservation.statut}</span>
              <span>
                Du {reservation.date_arrivee} au {reservation.date_depart}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
