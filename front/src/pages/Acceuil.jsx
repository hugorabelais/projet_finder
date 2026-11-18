import { Link } from 'react-router-dom';

const etapes = [
  {
    numero: "01",
    titre: "Comparez",
    description: "Parcourez les chambres de plusieurs hôtels au même endroit.",
  },
  {
    numero: "02",
    titre: "Choisissez",
    description: "Filtrez selon vos dates, votre budget et vos envies.",
  },
  {
    numero: "03",
    titre: "Profitez",
    description: "Retrouvez facilement vos réservations dans votre espace.",
  },
];

export default function Accueil() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-copy">
          <p className="home-kicker">FINDER · SÉJOURS MULTI-HÔTELS</p>
          <h1>
            Un séjour qui
            <br />
            <em>vous ressemble.</em>
          </h1>
          <p className="home-description">
            Comparez les chambres de plusieurs hôtels et trouvez le bon
            équilibre entre vos dates, votre confort et votre budget.
          </p>
          <div className="home-actions">
            <Link className="home-primary" to="/recherche">
              Explorer les chambres <span aria-hidden="true">↗</span>
            </Link>
            <Link className="home-secondary" to="/inscription">
              Créer un compte
            </Link>
          </div>
          <p className="home-note">
            <span className="home-note-mark" aria-hidden="true">
              F
            </span>
            Recherchez, comparez et réservez au même endroit.
          </p>
        </div>

        <div className="home-visual" aria-hidden="true">
          <article className="home-main-card">
            <div className="home-card-top">
              <span>UNE PARENTHÈSE BIEN MÉRITÉE</span>
              <span className="home-card-sparkle">✦</span>
            </div>
            <div className="home-landscape">
              <span className="home-sun" />
              <span className="home-hill home-hill-back" />
              <span className="home-hill home-hill-front" />
              <span className="home-hotel">
                <span className="home-hotel-roof" />
                <span className="home-hotel-body" />
              </span>
              <span className="home-landscape-path" />
            </div>
            <div className="home-card-caption">
              <strong>Le bon endroit, au bon moment.</strong>
              <span>À vous de choisir votre prochaine étape.</span>
            </div>
          </article>
          <div className="home-floating-note">
            <span aria-hidden="true">✓</span>
            Des séjours à votre rythme
          </div>
        </div>
      </section>

      <section className="home-steps">
        <div className="home-section-heading">
          <p className="eyebrow">SIMPLE COMME UN DÉPART</p>
          <h2>De la recherche à la réservation.</h2>
          <p>Tout ce qu’il faut pour préparer votre prochain séjour.</p>
        </div>
        <div className="home-step-list">
          {etapes.map((etape) => (
            <article className="home-step-card" key={etape.numero}>
              <span className="home-step-number">{etape.numero}</span>
              <h3>{etape.titre}</h3>
              <p>{etape.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}