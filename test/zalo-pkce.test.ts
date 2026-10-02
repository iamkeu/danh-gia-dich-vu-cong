import { describe, expect, it } from 'vitest';
import {
  createCodeChallenge,
  createPkceCookie,
  createPkceSession,
  getPkceCookieName,
  readPkceCookie,
} from '@/lib/zalo/pkce';

describe('Zalo OAuth PKCE', () => {
  it('creates a fresh 43-character verifier and S256 challenge for every session', () => {
    const first = createPkceSession();
    const second = createPkceSession();
    expect(first.verifier).toHaveLength(43);
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.state).not.toBe(second.state);
    expect(createCodeChallenge(first.verifier)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('matches the RFC 7636 S256 test vector', () => {
    expect(createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('round-trips a signed HttpOnly cookie and rejects tampering', () => {
    const session = createPkceSession();
    const cookie = createPkceCookie(session);
    expect(cookie.name).toBe(getPkceCookieName());
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe('lax');
    expect(readPkceCookie(cookie.value)).toEqual(session);
    expect(() => readPkceCookie(`${cookie.value}tampered`)).toThrow('INVALID_PKCE_SESSION');
  });

  it('rejects an expired session', () => {
    const session = createPkceSession();
    const cookie = createPkceCookie({ ...session, expiresAt: Math.floor(Date.now() / 1000) - 1 });
    expect(() => readPkceCookie(cookie.value)).toThrow('EXPIRED_PKCE_SESSION');
  });
});
