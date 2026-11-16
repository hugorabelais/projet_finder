export default function FicheChambre({ hotel, chambre, onFermer }) {
  return (
    <article className="detail-panel" aria-live="polite">
      <div className="detail-cover">
        <span className="cover-kicker">VOTRE SÉLECTION</span>
        <span className="cover-number">{chambre.numero}</span>
        <span className="cover-caption">Une parenthèse de confort</span>
        <span className="cover-orb cover-orb-one" aria-hidden="true" />
        <span className="cover-orb cover-orb-two" aria-hidden="true" />
      </div>

      <div className="detail-content">
        <div className="detail-heading">
          <div>
            <p className="eyebrow">CHAMBRE N° {chambre.numero}</p>
            <h2>{chambre.categorie}</h2>
          </div>
          <span className="category-badge">{chambre.categorie}</span>
        </div>

        <p className="detail-description">{chambre.description}</p>

        <div className="detail-facts">
          <div className="detail-fact">
            <span>Capacité</span>
            <strong>{chambre.capacite} personne(s)</strong>
          </div>
          <div className="detail-fact">
            <span>Tarif par nuit</span>
            <strong>{chambre.prixNuit} €</strong>
          </div>
        </div>

        <div className="hotel-card">
          <span className="hotel-card-icon" aria-hidden="true">
            A
          </span>
          <span>
            <small>Votre hôtel</small>
            <strong>{hotel.nom}</strong>
            <span>
              {hotel.adresse}, {hotel.codePostal} {hotel.ville}
            </span>
          </span>
        </div>

        <button type="button" className="detail-close" onClick={onFermer}>
          Fermer
        </button>
      </div>
    </article>
  );
}
