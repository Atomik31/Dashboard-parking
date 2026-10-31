import { describe, expect, it } from 'vitest';
import { emailValide, methodeDepuisProvider, parseHeures, parseLangue, uidValide } from '../server/validation.js';

describe('validation des entrées', () => {
  it('hours : liste blanche', () => {
    expect(parseHeures(undefined)).toBe(6);
    for (const h of ['1', '6', '12', '24']) expect(parseHeures(h)).toBe(Number(h));
  });
  it.each(['0', '2', '48', '-1', '6.5', '06', '1e1', '', 'abc', ['1', '6'], { a: 1 }, '6; DROP', '１２'])('hours invalide : %j', v => {
    expect(parseHeures(v)).toBeNull();
  });
  it('lang : liste blanche, fr par défaut', () => {
    expect(parseLangue('en')).toBe('en');
    expect(parseLangue('fr')).toBe('fr');
    expect(parseLangue('de')).toBe('fr');
    expect(parseLangue({ x: 1 })).toBe('fr');
    expect(parseLangue(undefined)).toBe('fr');
  });
  it('uid', () => {
    expect(uidValide('abcDEF123_-:')).toBe(true);
    expect(uidValide('a"}),RECORD_ID()&("')).toBe(false);
    expect(uidValide('')).toBe(false);
    expect(uidValide('x'.repeat(129))).toBe(false);
  });
  it('méthode déduite du provider', () => {
    expect(methodeDepuisProvider('google.com')).toBe('Google');
    expect(methodeDepuisProvider('password')).toBe('E-mail');
    expect(methodeDepuisProvider('anonymous')).toBeNull();
    expect(methodeDepuisProvider(undefined)).toBeNull();
  });
  it('e-mail', () => {
    expect(emailValide('a@b.fr')).toBe(true);
    expect(emailValide('a b@c.fr')).toBe(false);
    expect(emailValide(undefined)).toBe(false);
  });
});
