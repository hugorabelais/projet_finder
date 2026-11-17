export default function FicheHotel({ hotel }) {
  return (
    <article className="selected-hotel-card">
      <header className="selected-hotel-heading">
        <span className="hotel-card-icon" aria-hidden="true">
          H
        </span>
        <div className="selected-hotel-title">
          <p className="eyebrow">HÔTEL SÉLECTIONNÉ</p>
          <h2>{hotel.nom}</h2>
        </div>
        <span className="category-badge">
          {hotel.etoiles} {hotel.etoiles === 1 ? "étoile" : "étoiles"}
        </span>
      </header>
      <p className="selected-hotel-address">
        {hotel.adresse}, {hotel.code_postal} {hotel.ville}
      </p>
      <p className="selected-hotel-description">{hotel.description}</p>
    </article>
  );
}
