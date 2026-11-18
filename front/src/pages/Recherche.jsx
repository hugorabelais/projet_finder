import { useEffect, useState } from "react";
import { API } from "../config";
import FicheChambre from "../composants/FicheChambre";
import FicheHotel from "../composants/FicheHotel";
import ListeChambres from "../composants/ListeChambres";

const criteresInitiaux = {
  hotel_id: "",
  date_debut: "",
  date_fin: "",
  capacite: "",
  prix_max: "",
  categorie: "",
};

function EnteteRecherche() {
  return (
    <section className="page-intro">
      <p className="eyebrow">RECHERCHE MULTI-HÔTELS</p>
      <h1>
        Trouvez votre chambre
        <br />
        <span>idéale.</span>
      </h1>
      <p className="intro-copy">
        Comparez les chambres selon vos dates et vos critères.
      </p>
    </section>
  );
}

export default function Recherche() {
  const [criteres, setCriteres] = useState(criteresInitiaux);
  const [criteresValides, setCriteresValides] = useState({});
  const [versionRecherche, setVersionRecherche] = useState(0);
  const [versionHotels, setVersionHotels] = useState(0);
  const [hotels, setHotels] = useState([]);
  const [chargementHotels, setChargementHotels] = useState(true);
  const [erreurHotels, setErreurHotels] = useState("");
  const [chambres, setChambres] = useState([]);
  const [chambreSelectionnee, setChambreSelectionnee] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [apiIndisponible, setApiIndisponible] = useState(false);
  const hotelSelectionne = hotels.find(
    (hotel) => String(hotel.hotel_id) === criteres.hotel_id,
  );

  useEffect(() => {
    let annule = false;

    async function chargerHotels() {
      try {
        const reponse = await fetch(`${API}/hotels`);
        if (!reponse.ok) {
          if (!annule && reponse.status >= 500) setApiIndisponible(true);
          throw new Error(`Le chargement des hôtels a échoué (HTTP ${reponse.status}).`);
        }

        const resultat = await reponse.json();
        if (!Array.isArray(resultat)) {
          if (!annule) setApiIndisponible(true);
          throw new Error("La réponse de l’API n’est pas une liste d’hôtels.");
        }

        if (!annule) setHotels(resultat);
      } catch (erreurChargement) {
        if (!annule) {
          if (erreurChargement instanceof TypeError) {
            setApiIndisponible(true);
          }
          setErreurHotels(
            erreurChargement instanceof TypeError
              ? "Impossible de charger la liste des hôtels."
              : erreurChargement instanceof Error
                ? erreurChargement.message
                : "Le chargement des hôtels a échoué.",
          );
        }
      } finally {
        if (!annule) setChargementHotels(false);
      }
    }

    chargerHotels();
    return () => {
      annule = true;
    };
  }, [versionHotels]);

  useEffect(() => {
    let annule = false;

    async function chargerChambres() {
      const params = new URLSearchParams();
      for (const [cle, valeur] of Object.entries(criteresValides)) {
        if (valeur !== "") params.set(cle, valeur);
      }

      const query = params.toString();
      const url = `${API}/chambres${query ? `?${query}` : ""}`;

      try {
        const reponse = await fetch(url);
        if (!reponse.ok) {
          if (!annule && reponse.status >= 500) setApiIndisponible(true);
          throw new Error(`La recherche a échoué (HTTP ${reponse.status}).`);
        }

        const resultat = await reponse.json();
        if (!Array.isArray(resultat)) {
          if (!annule) setApiIndisponible(true);
          throw new Error("La réponse de l’API n’est pas une liste de chambres.");
        }

        if (!annule) {
          setChambres(resultat);
        }
      } catch (erreurRecherche) {
        if (!annule) {
          if (erreurRecherche instanceof TypeError) {
            setApiIndisponible(true);
          }
          setErreur(
            erreurRecherche instanceof TypeError
              ? "Impossible de joindre l’API. Vérifiez que le serveur est démarré."
              : erreurRecherche instanceof Error
                ? erreurRecherche.message
                : "La recherche a échoué.",
          );
          setChambres([]);
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    chargerChambres();
    return () => {
      annule = true;
    };
  }, [criteresValides, versionRecherche]);

  function changer(evenement) {
    const { name, value } = evenement.target;
    setCriteres((criteresActuels) => ({
      ...criteresActuels,
      [name]: value,
    }));
  }

  function rechercher(evenement) {
    evenement.preventDefault();
    setChargement(true);
    setErreur("");
    setChambreSelectionnee(null);
    setCriteresValides(criteres);
    setVersionRecherche((version) => version + 1);
  }

  function reessayer() {
    setApiIndisponible(false);
    setErreurHotels("");
    setErreur("");
    setChargementHotels(true);
    setChargement(true);
    setVersionHotels((version) => version + 1);
    setVersionRecherche((version) => version + 1);
  }

  if (apiIndisponible) {
    return (
      <>
        <EnteteRecherche />
        <section className="api-unavailable" role="alert">
          <span className="api-unavailable-icon" aria-hidden="true">
            !
          </span>
          <p className="eyebrow">CONNEXION AU SERVICE</p>
          <h2>API indisponible</h2>
          <p>
            La recherche ne peut pas accéder au service pour le moment. Vérifiez
            que l’API est démarrée, puis réessayez.
          </p>
          <button className="search-submit" type="button" onClick={reessayer}>
            Réessayer
          </button>
        </section>
        <footer className="page-footer">
          Les tarifs sont indiqués par nuit et par chambre.
        </footer>
      </>
    );
  }

  return (
    <>
      <EnteteRecherche />
      {hotelSelectionne && <FicheHotel hotel={hotelSelectionne} />}

      <section className="search-panel">
        <header className="panel-heading">
          <div>
            <p className="eyebrow">PERSONNALISEZ VOTRE SÉJOUR</p>
            <h2>Vos critères</h2>
          </div>
        </header>

        <form className="search-form" onSubmit={rechercher}>
          <label className="search-field" htmlFor="hotel_id">
            Hôtel
            <select
              id="hotel_id"
              name="hotel_id"
              value={criteres.hotel_id}
              onChange={changer}
              disabled={chargementHotels}
            >
              <option value="">
                {chargementHotels
                  ? "Chargement des hôtels…"
                  : "Tous les hôtels"}
              </option>
              {hotels.map((hotel) => (
                <option key={hotel.hotel_id} value={hotel.hotel_id}>
                  {hotel.nom}
                </option>
              ))}
            </select>
          </label>

          <label className="search-field" htmlFor="date_debut">
            Date d’arrivée
            <input
              id="date_debut"
              name="date_debut"
              type="date"
              value={criteres.date_debut}
              onChange={changer}
            />
          </label>

          <label className="search-field" htmlFor="date_fin">
            Date de départ
            <input
              id="date_fin"
              name="date_fin"
              type="date"
              value={criteres.date_fin}
              onChange={changer}
            />
          </label>

          <label className="search-field" htmlFor="capacite">
            Capacité minimale
            <input
              id="capacite"
              name="capacite"
              type="number"
              min="1"
              value={criteres.capacite}
              onChange={changer}
              placeholder="Nombre de personnes"
            />
          </label>

          <label className="search-field" htmlFor="prix_max">
            Prix maximum par nuit (€)
            <input
              id="prix_max"
              name="prix_max"
              type="number"
              min="0"
              step="0.01"
              value={criteres.prix_max}
              onChange={changer}
              placeholder="Sans limite"
            />
          </label>

          <label className="search-field" htmlFor="categorie">
            Catégorie
            <select
              id="categorie"
              name="categorie"
              value={criteres.categorie}
              onChange={changer}
            >
              <option value="">Toutes les catégories</option>
              <option value="simple">Simple</option>
              <option value="double">Double</option>
              <option value="familiale">Familiale</option>
              <option value="suite">Suite</option>
            </select>
          </label>

          <button className="search-submit" type="submit">
            Rechercher
          </button>
        </form>
        {erreurHotels && (
          <p className="search-error" role="alert">
            {erreurHotels}
          </p>
        )}
      </section>

      <main
        className={`booking-layout${chambreSelectionnee ? " has-selection" : ""}`}
      >
        <section className="chambres-panel">
          <header className="panel-heading">
            <div>
              <p className="eyebrow">RÉSULTATS DE RECHERCHE</p>
              <h2>Chambres disponibles</h2>
            </div>
            {chambres.length > 0 && (
              <span className="room-count">
                {chambres.length}{" "}
                {chambres.length === 1 ? "chambre" : "chambres"}
              </span>
            )}
          </header>
          {chargement ? (
            <p className="empty-state" role="status">
              Recherche des chambres…
            </p>
          ) : erreur ? (
            <p className="search-error" role="alert">
              {erreur}
            </p>
          ) : (
            <ListeChambres
              chambres={chambres}
              chambreSelectionnee={chambreSelectionnee}
              onChoix={setChambreSelectionnee}
            />
          )}
        </section>
        {chambreSelectionnee && (
          <FicheChambre
            chambre={chambreSelectionnee}
            onFermer={() => setChambreSelectionnee(null)}
          />
        )}
      </main>
      <footer className="page-footer">
        Les tarifs sont indiqués par nuit et par chambre.
      </footer>
    </>
  );
}
