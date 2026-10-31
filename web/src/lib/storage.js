/* Accès sûrs au stockage navigateur (peut lever en navigation privée, cookies bloqués, etc.). */
export function lireLocal(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
export function ecrireLocal(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}
export function supprimerLocal(cle) {
  try {
    localStorage.removeItem(cle);
  } catch {
    /* ignoré */
  }
}
