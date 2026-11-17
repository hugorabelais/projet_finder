import Recherche from "./pages/Recherche";
import "./App.css";

export default function App() {
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
      </header>

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

      <Recherche />

      <footer className="page-footer">
        Les tarifs sont indiqués par nuit et par chambre.
      </footer>
    </div>
  );
}
