import crypto from 'node:crypto';

const COOKIE_NAME = 'zalo_oauth_pkce';
const TTL_SECONDS = 10 * 60;

type PkceSession = {
  state: string;
  verifier: string;
  expiresAt: number;
};

function secret(): Buffer {
  const value = process.env.PUBLIC_SERVICE_JWT_SECRET;
  if (!value || value.length < 32) throw new Error('PKCE_SESSION_SECRET_NOT_CONFIGURED');
  return Buffer.from(value, 'utf8');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(session: PkceSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(value: string): PkceSession {
  const separator = value.lastIndexOf('.');
  if (separator <= 0) throw new Error('INVALID_PKCE_SESSION');
  const payload = value.slice(0, separator);
  const providedSignature = value.slice(separator + 1);
  const expectedSignature = sign(payload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('INVALID_PKCE_SESSION');
  }
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PkceSession;
  if (!session.state || !session.verifier || !session.expiresAt || session.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error('EXPIRED_PKCE_SESSION');
  }
  return session;
}

export function createPkceSession(): PkceSession {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return {
    state: crypto.randomBytes(32).toString('base64url'),
    verifier,
    expiresAt: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
}

export function createCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export function createPkceCookie(session: PkceSession): { name: string; value: string; options: Record<string, string | boolean | number> } {
  return {
    name: COOKIE_NAME,
    value: encode(session),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/zalo/oauth/callback',
      maxAge: TTL_SECONDS,
    },
  };
}

export function readPkceCookie(value: string | undefined): PkceSession {
  if (!value) throw new Error('MISSING_PKCE_SESSION');
  return decode(value);
}

export function getPkceCookieName(): string {
  return COOKIE_NAME;
}

export const PKCE_TTL_SECONDS = TTL_SECONDS;
