import { useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../config";

export default function Inscription() {
  const [champs, setChamps] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    mot_de_passe: "",
  });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  function modifierChamp(evenement) {
    const { name, value } = evenement.target;
    setChamps((valeurs) => ({ ...valeurs, [name]: value }));
  }

  async function inscrire(evenement) {
    evenement.preventDefault();
    setErreur("");
    setSucces(false);
    setChargement(true);

    const corps = {
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      mot_de_passe: champs.mot_de_passe,
    };
    if (champs.telephone) corps.telephone = champs.telephone;

    try {
      const reponse = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const resultat = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          resultat.erreur || `L’inscription a échoué (HTTP ${reponse.status}).`,
        );
      }

      setSucces(true);
    } catch (erreurInscription) {
      setErreur(
        erreurInscription instanceof TypeError
          ? "Impossible de joindre l’API. Vérifiez que le serveur est démarré."
          : erreurInscription instanceof Error
            ? erreurInscription.message
            : "L’inscription a échoué.",
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="simple-page">
      <h1>Inscription</h1>
      <p>Créez un compte pour gérer vos réservations Finder.</p>
      <form className="auth-form" onSubmit={inscrire}>
        <label>
          Prénom
          <input
            name="prenom"
            value={champs.prenom}
            onChange={modifierChamp}
            autoComplete="given-name"
            required
          />
        </label>
        <label>
          Nom
          <input
            name="nom"
            value={champs.nom}
            onChange={modifierChamp}
            autoComplete="family-name"
            required
          />
        </label>
        <label>
          Adresse e-mail
          <input
            type="email"
            name="email"
            value={champs.email}
            onChange={modifierChamp}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Téléphone (facultatif)
          <input
            type="tel"
            name="telephone"
            value={champs.telephone}
            onChange={modifierChamp}
            autoComplete="tel"
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            name="mot_de_passe"
            value={champs.mot_de_passe}
            onChange={modifierChamp}
            autoComplete="new-password"
            required
          />
        </label>
        {erreur && (
          <p className="form-error" role="alert">
            {erreur}
          </p>
        )}
        {succes && (
          <p className="form-success" role="status">
            Compte créé. <Link to="/connexion">Connectez-vous</Link>.
          </p>
        )}
        <button className="search-submit auth-submit" disabled={chargement}>
          {chargement ? "Création du compte…" : "Créer mon compte"}
        </button>
      </form>
    </section>
  );
}
