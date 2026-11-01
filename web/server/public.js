/* Aperçu public des places (page de connexion) : liste blanche stricte des champs exposés sans authentification.
   Ni coordonnées, ni horodatages par parking : uniquement ce qu'il faut pour afficher « places libres maintenant ». */
const CHAMPS_TEXTE = ['nom', 'statut', 'affichage'];
const CHAMPS_NOMBRE = ['places', 'capacite'];

export function apercuPublic(data) {
  const parkings = Array.isArray(data?.parkings) ? data.parkings : [];
  return {
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
    parkings: parkings
      .map(p => {
        const sortie = {};
        for (const c of CHAMPS_TEXTE) sortie[c] = typeof p?.[c] === 'string' ? p[c].slice(0, 80) : '';
        for (const c of CHAMPS_NOMBRE) sortie[c] = Number.isFinite(p?.[c]) ? p[c] : 0;
        return sortie;
      })
      .filter(p => p.nom)
  };
}
