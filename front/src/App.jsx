import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { jeton, setJeton } from "./auth";
import { API } from "./config";
import "./App.css";

export default function App() {
  const [connecte, setConnecte] = useState(() => Boolean(jeton()));
  const [erreurDeconnexion, setErreurDeconnexion] = useState("");
  const navigate = useNavigate();

  async function deconnecter() {
    const jetonCourant = jeton();
    setErreurDeconnexion("");

    try {
      if (jetonCourant) {
        const reponse = await fetch(`${API}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jetonCourant}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!reponse.ok && reponse.status !== 401) {
          throw new Error(
            `La déconnexion a échoué (HTTP ${reponse.status}).`,
          );
        }
      }
    } catch (erreur) {
      setErreurDeconnexion(
        erreur instanceof TypeError
          ? "Impossible de joindre l’API. La session locale a été fermée."
          : erreur instanceof Error
            ? `${erreur.message} La session locale a été fermée.`
            : "La déconnexion a échoué. La session locale a été fermée.",
      );
    } finally {
      setJeton(null);
      setConnecte(false);
      navigate("/recherche");
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-brand">
          <span className="site-monogram" aria-hidden="true">
            F
          </span>
          <span>
            <strong>Finder</strong>
            <small>Gestion multi-hôtels</small>
          </span>
        </div>
        <nav className="site-navigation" aria-label="Navigation principale">
          <Link className="site-home-link" to="/">
            Accueil
          </Link>
          {connecte ? (
            <button type="button" onClick={deconnecter}>
              Déconnexion
            </button>
          ) : (
            <Link to="/connexion">Connexion</Link>
          )}
          <Link to="/inscription">Inscription</Link>
          <Link to="/recherche">Recherche</Link>
          <Link to="/mes-reservations">Mes réservations</Link>
        </nav>
      </header>

      {erreurDeconnexion && (
        <p className="form-error" role="alert">
          {erreurDeconnexion}
        </p>
      )}
      <Outlet context={{ connecte, setConnecte }} />
    </div>
  );
}
