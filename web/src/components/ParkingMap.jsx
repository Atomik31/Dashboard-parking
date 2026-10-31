import './../lib/leafletGlobal.js';
import L from 'leaflet';
import 'leaflet-gesture-handling';
import 'leaflet/dist/leaflet.css';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css';
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { CENTRE_CARTE, ZOOM_CARTE } from '../../shared/config.js';
import { COULEURS_ETAT, etatParking } from '../lib/format.js';

const SURFACE = '#1F1F24';

/* Pastille DivIcon : seules des valeurs numériques / constantes entrent dans le HTML (pas de texte externe). */
function pastille(parking) {
  const etat = etatParking(parking.statut, parking.places, parking.capacite);
  const texte = etat === 'warn' ? '#3a2a00' : '#ffffff';
  const valeur = etat !== 'closed' ? String(Number(parking.places) || 0) : '–';
  const html =
    '<div style="transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:4px;' +
    `min-width:44px;height:32px;padding:0 10px;border-radius:999px;background:${COULEURS_ETAT[etat]};color:${texte};` +
    `border:2px solid ${SURFACE};font:700 13px system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.5);">` +
    `<span style="font-size:10px;opacity:0.85;">P</span>${valeur}</div>`;
  return L.divIcon({ html, className: 'pk-pin', iconSize: [0, 0], iconAnchor: [0, 0] });
}

const LEGENDE = [
  ['good', 'Large (> 50 % libres)'],
  ['warn', 'Limité (10 à 50 %)'],
  ['crit', 'Presque complet (< 10 %)'],
  ['closed', 'Fermé ou sans données']
];

export default function ParkingMap({ parkings }) {
  return (
    <div className="pk-map">
      <MapContainer center={CENTRE_CARTE} zoom={ZOOM_CARTE} gestureHandling scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="Google" />
        {parkings.map(p => (
          <Marker key={`${p.nom}-${p.places}-${p.statut}`} position={[p.latitude, p.longitude]} icon={pastille(p)}>
            <Tooltip>
              {p.nom} : {p.affichage} · MAJ {p.timestamp}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="pk-legend">
        {LEGENDE.map(([etat, label]) => (
          <span key={etat}>
            <i style={{ background: COULEURS_ETAT[etat] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
