import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthError, assertConfigSure, createTokenVerifier } from '../server/auth.js';

const PROJET = 'mon-projet';
let privee;
let verify;
let autrePrivee;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  privee = privateKey;
  autrePrivee = (await generateKeyPair('RS256')).privateKey;
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  verify = createTokenVerifier({ projectId: PROJET, jwks: createLocalJWKSet({ keys: [jwk] }) });
});

async function jeton({ iss = `https://securetoken.google.com/${PROJET}`, aud = PROJET, sub = 'uid123', email = 'Julien@Example.com', exp = '1h', key = privee, alg = 'RS256', provider = 'google.com', extra = {} } = {}) {
  const claims = { ...(email ? { email } : {}), firebase: { sign_in_provider: provider }, ...extra };
  let j = new SignJWT(claims).setProtectedHeader({ alg, kid: 'k1' }).setIssuer(iss).setAudience(aud).setIssuedAt();
  if (sub) j = j.setSubject(sub);
  return j.setExpirationTime(exp).sign(key);
}

describe('vérification du jeton Firebase', () => {
  it('accepte un jeton valide et normalise l\'e-mail', async () => {
    const u = await verify(await jeton());
    expect(u).toMatchObject({ uid: 'uid123', email: 'julien@example.com', provider: 'google.com' });
  });
  it('n\'exige pas email_verified', async () => {
    expect((await verify(await jeton({ extra: { email_verified: false } }))).uid).toBe('uid123');
  });
  it.each([
    ['mauvais issuer', { iss: 'https://securetoken.google.com/autre' }],
    ['mauvaise audience', { aud: 'autre' }],
    ['expiré', { exp: Math.floor(Date.now() / 1000) - 3600 }],
    ['sans sub', { sub: null }],
    ['sub invalide', { sub: 'uid avec espace' }],
    ['sans e-mail', { email: null }],
    ['e-mail invalide', { email: 'pas-un-email' }],
    ['mauvaise clé de signature', { key: 'AUTRE' }]
  ])('refuse : %s', async (_nom, opts) => {
    const o = opts.key === 'AUTRE' ? { ...opts, key: autrePrivee } : opts;
    await expect(verify(await jeton(o))).rejects.toBeInstanceOf(AuthError);
  });
  it('refuse un jeton mal formé', async () => {
    await expect(verify('abc.def.ghi')).rejects.toMatchObject({ status: 401 });
  });
  it('refuse un jeton alg=none', async () => {
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const t = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: `https://securetoken.google.com/${PROJET}`, aud: PROJET, sub: 'x', email: 'a@b.fr', exp: 9999999999 })}.`;
    await expect(verify(t)).rejects.toBeInstanceOf(AuthError);
  });
  it('sans projectId : refuse tout (pas de fail open)', async () => {
    const v = createTokenVerifier({ projectId: '', jwks: createLocalJWKSet({ keys: [] }) });
    await expect(v(await jeton())).rejects.toMatchObject({ status: 503 });
  });
});

describe('garde-fou du contournement dev', () => {
  it('refuse de démarrer en production avec AUTH_DEV_BYPASS', () => {
    expect(() => assertConfigSure({ NODE_ENV: 'production', AUTH_DEV_BYPASS: '1' })).toThrow(/interdit en production/);
    expect(() => assertConfigSure({ NODE_ENV: 'production', AUTH_DEV_BYPASS: 'true' })).toThrow();
  });
  it('autorisé hors production, inactif par défaut', () => {
    expect(() => assertConfigSure({ NODE_ENV: 'development', AUTH_DEV_BYPASS: '1' })).not.toThrow();
    expect(() => assertConfigSure({ NODE_ENV: 'production', AUTH_DEV_BYPASS: '0' })).not.toThrow();
    expect(() => assertConfigSure({ NODE_ENV: 'production' })).not.toThrow();
  });
});
