import './../lib/leafletGlobal.js';
import L from 'leaflet';
import 'leaflet-gesture-handling';
import 'leaflet/dist/leaflet.css';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { CENTRE_CARTE, ZOOM_CARTE } from '../../shared/config.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { etatParking } from '../lib/format.js';
import { libelleAffichage } from '../lib/i18n.js';

/* Pastille DivIcon : seules des valeurs numériques et des constantes entrent dans le HTML (jamais de texte externe). */
function pastille(parking) {
  const etat = etatParking(parking.statut, parking.places, parking.capacite);
  const valeur = etat !== 'closed' ? String(Number(parking.places) || 0) : '–';
  return L.divIcon({ html: `<div class="pin ${etat}"><b>P</b>${valeur}</div>`, className: 'pin-wrap', iconSize: [0, 0], iconAnchor: [0, 0] });
}

const LEGENDE = ['good', 'warn', 'crit', 'closed'];
const COULEUR = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)', closed: 'var(--closed)' };

/* Centre la carte sur le parking choisi dans la liste. */
function Focus({ parkings, selection }) {
  const map = useMap();
  useEffect(() => {
    if (selection?.origine !== 'liste') return;
    const p = parkings.find(x => x.nom === selection.nom);
    if (p) map.flyTo([p.latitude, p.longitude], 16, { duration: 0.8 });
  }, [map, parkings, selection]);
  return null;
}

export default function ParkingMap({ parkings, selection, onSelect }) {
  const { t } = useI18n();
  return (
    <div className="card map-card">
      <div id="map">
        <MapContainer center={CENTRE_CARTE} zoom={ZOOM_CARTE} gestureHandling scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="Google" />
          <Focus parkings={parkings} selection={selection} />
          {parkings.map(p => (
            <Marker
              key={`${p.nom}-${p.places}-${p.statut}`}
              position={[p.latitude, p.longitude]}
              icon={pastille(p)}
              eventHandlers={{ click: () => onSelect({ nom: p.nom, origine: 'carte' }) }}
            >
              <Tooltip direction="top" offset={[0, -22]}>
                {p.nom} : {libelleAffichage(p.affichage, t)} · {t.card_updated} {p.timestamp}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="legend" aria-hidden="true">
        {LEGENDE.map(etat => (
          <span key={etat}>
            <i style={{ background: COULEUR[etat] }} />
            {t[`legend_${etat}`]}
          </span>
        ))}
      </div>
    </div>
  );
}
