/* Enregistrement des comptes dans Airtable (upsert par UID Firebase). Jeton PAT uniquement côté serveur (AIRTABLE_TOKEN). */
import { uidValide } from './validation.js';

export const AIRTABLE_BASE_ID = 'appHnOPUpb7FbokMj';
export const AIRTABLE_TABLE_ID = 'tblquStqPWLSz41gj'; // table « Comptes »
const API = 'https://api.airtable.com/v0';

export const CHAMPS = { email: 'Email', uid: 'UID Firebase', methode: 'Méthode', langue: 'Langue', cree: 'Créé le' };

async function airtable(fetchImpl, token, url, options = {}) {
  const res = await fetchImpl(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`Airtable HTTP ${res.status}`);
  return res.json();
}

/* Crée ou met à jour le compte. « Créé le » n'est renseigné qu'à la création.
   Retourne 'created' | 'updated'. Lève une Error en cas d'échec Airtable. */
export async function upsertCompte({ token, email, uid, methode, langue }, { fetchImpl = fetch, now = () => new Date() } = {}) {
  if (!token) throw new Error('AIRTABLE_TOKEN absent');
  if (!uidValide(uid)) throw new Error('UID invalide');
  const base = `${API}/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  /* uid validé par liste blanche de caractères : aucune injection possible dans la formule */
  const formule = `{${CHAMPS.uid}}="${uid}"`;
  const recherche = await airtable(
    fetchImpl,
    token,
    `${base}?maxRecords=1&pageSize=1&filterByFormula=${encodeURIComponent(formule)}&fields%5B%5D=${encodeURIComponent(CHAMPS.uid)}`
  );
  const existant = recherche.records?.[0];
  const champs = { [CHAMPS.email]: email, [CHAMPS.uid]: uid, [CHAMPS.methode]: methode, [CHAMPS.langue]: langue };
  if (existant) {
    await airtable(fetchImpl, token, `${base}/${existant.id}`, { method: 'PATCH', body: JSON.stringify({ fields: champs }) });
    return 'updated';
  }
  champs[CHAMPS.cree] = now().toISOString();
  await airtable(fetchImpl, token, base, { method: 'POST', body: JSON.stringify({ fields: champs }) });
  return 'created';
}
