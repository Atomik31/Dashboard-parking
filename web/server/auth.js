/* Vérification des jetons Firebase (ID tokens) SANS compte de service : signature RS256 contrôlée avec le JWKS public
   de Google (securetoken), puis iss / aud / exp / sub. Jamais de « fail open » : sans FIREBASE_PROJECT_ID, tout est refusé. */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { emailValide, uidValide } from './validation.js';

export const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

/* Retourne async (idToken) => { uid, email, provider, claims } ; lève AuthError si le jeton est invalide. */
export function createTokenVerifier({ projectId, jwks = createRemoteJWKSet(new URL(JWKS_URL), { cooldownDuration: 30_000 }), clockTolerance = 5 }) {
  return async function verify(idToken) {
    if (!projectId) throw new AuthError('Authentification non configurée', 503);
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, jwks, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ['RS256'],
        clockTolerance
      }));
    } catch {
      throw new AuthError('Jeton invalide ou expiré');
    }
    if (typeof payload.sub !== 'string' || !payload.sub || !uidValide(payload.sub)) throw new AuthError('Jeton invalide');
    if (typeof payload.auth_time === 'number' && payload.auth_time > Math.floor(Date.now() / 1000) + clockTolerance) {
      throw new AuthError('Jeton invalide');
    }
    if (!emailValide(payload.email)) throw new AuthError('Jeton sans adresse e-mail');
    return {
      uid: payload.sub,
      email: payload.email.toLowerCase(),
      provider: payload.firebase?.sign_in_provider ?? null,
      claims: payload
    };
  };
}

/* Vérificateur de développement : accepte « Bearer dev-bypass ». Refusé en production (voir assertConfigSure). */
export const DEV_TOKEN = 'dev-bypass';
export function createDevVerifier() {
  return async function verify(idToken) {
    if (idToken !== DEV_TOKEN) throw new AuthError('Jeton invalide');
    return { uid: 'dev-user', email: 'dev@localhost.test', provider: 'password', claims: {} };
  };
}

/* Middleware : exige Authorization: Bearer <idToken> valide. Place { uid, email, provider } dans req.user. */
export function requireAuth(verify) {
  return async (req, res, next) => {
    const entete = req.get('authorization') || '';
    const m = /^Bearer ([A-Za-z0-9._-]{10,4096})$/.exec(entete);
    if (!m) return res.status(401).json({ error: 'Authentification requise' });
    try {
      req.user = await verify(m[1]);
      next();
    } catch (err) {
      if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  };
}

/* Refuse de démarrer si le contournement d'authentification est actif en production. */
export const bypassActif = env => ['1', 'true'].includes(String(env.AUTH_DEV_BYPASS ?? '').toLowerCase());
export function assertConfigSure(env) {
  if (env.NODE_ENV === 'production' && bypassActif(env)) {
    throw new Error('AUTH_DEV_BYPASS est interdit en production : démarrage refusé.');
  }
}
