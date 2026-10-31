/* Cache mémoire à TTL avec « single flight » : plusieurs requêtes simultanées partagent un seul chargement. */
export function createTtlCache({ ttlMs, loader, now = () => Date.now() }) {
  let valeur;
  let expire = 0;
  let enCours = null;
  let chargeLe = 0;

  async function charger() {
    if (!enCours) {
      enCours = Promise.resolve()
        .then(loader)
        .then(v => {
          valeur = v;
          chargeLe = now();
          expire = chargeLe + ttlMs;
          return v;
        })
        .finally(() => {
          enCours = null;
        });
    }
    return enCours;
  }

  return {
    async get() {
      if (valeur !== undefined && now() < expire) return valeur;
      return charger();
    },
    /* Force un rechargement, sauf si la valeur a moins de `minAgeMs` (protège la source). */
    async refresh(minAgeMs = 0) {
      if (valeur !== undefined && now() - chargeLe < minAgeMs) return valeur;
      return charger();
    },
    clear() {
      valeur = undefined;
      expire = 0;
    }
  };
}
