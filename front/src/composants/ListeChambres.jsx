export default function ListeChambres({
  chambres,
  chambreSelectionnee,
  onChoix,
}) {
  if (chambres.length === 0) {
    return <p className="empty-state">Aucune chambre à afficher pour le moment.</p>;
  }

  return (
    <ul className="room-list" aria-label="Liste des chambres">
      {chambres.map((chambre) => (
        <li key={chambre.chambre_id}>
          <button
            type="button"
            className={`room-row${
              chambreSelectionnee?.chambre_id === chambre.chambre_id
                ? " is-selected"
                : ""
            }`}
            aria-pressed={
              chambreSelectionnee?.chambre_id === chambre.chambre_id
            }
            onClick={() => onChoix(chambre)}
          >
            <span className="room-number">{chambre.numero}</span>
            <span className="room-description">
              <strong>{chambre.categorie}</strong>
              <small>
                {chambre.capacite} personne(s) · Chambre n° {chambre.numero}
              </small>
            </span>
            <span className="room-price">
              <strong>{chambre.prix_nuit} €</strong>
              <small>/ nuit</small>
            </span>
            <span className="room-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
