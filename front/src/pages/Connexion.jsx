import { useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { API } from "../config";
import { setJeton } from "../auth";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setConnecte } = useOutletContext();

  async function connecter(evenement) {
    evenement.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const reponse = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          mot_de_passe: motDePasse,
        }),
      });
      const resultat = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          resultat.erreur || `La connexion a échoué (HTTP ${reponse.status}).`,
        );
      }
      if (typeof resultat.token !== "string" || resultat.token.length === 0) {
        throw new Error("La réponse de l’API ne contient pas de jeton valide.");
      }

      setJeton(resultat.token);
      setConnecte(true);
      navigate("/recherche");
    } catch (erreurConnexion) {
      setErreur(
        erreurConnexion instanceof TypeError
          ? "Impossible de joindre l’API. Vérifiez que le serveur est démarré."
          : erreurConnexion instanceof Error
            ? erreurConnexion.message
            : "La connexion a échoué.",
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="simple-page">
      <h1>Connexion</h1>
      <p>Connectez-vous pour retrouver vos réservations.</p>
      {location.state?.message && (
        <p className="form-success" role="status">
          {location.state.message}
        </p>
      )}
      <form className="auth-form" onSubmit={connecter}>
        <label>
          Adresse e-mail
          <input
            type="email"
            name="email"
            value={email}
            onChange={(evenement) => setEmail(evenement.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            name="mot_de_passe"
            value={motDePasse}
            onChange={(evenement) => setMotDePasse(evenement.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {erreur && (
          <p className="form-error" role="alert">
            {erreur}
          </p>
        )}
        <button className="search-submit auth-submit" disabled={chargement}>
          {chargement ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </section>
  );
}
