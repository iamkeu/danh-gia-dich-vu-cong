import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type PublicServiceRole = 'admin' | 'leader' | 'operator';
export type PublicServiceAccount = { id: string; email: string; display_name: string; role: PublicServiceRole; status: string };

const COOKIE_NAME = 'public_service_session';
const jwtSecret = () => new TextEncoder().encode(process.env.PUBLIC_SERVICE_JWT_SECRET || process.env.JWT_SECRET || 'development-only-change-me');

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, digest] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !digest) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(account: PublicServiceAccount) {
  const token = await new SignJWT({ email: account.email, role: account.role, displayName: account.display_name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(account.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(jwtSecret());
  cookies().set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function requirePublicServiceAccount(roles?: PublicServiceRole[]) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) throw new Error('UNAUTHENTICATED');
  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwtSecret()));
  } catch {
    throw new Error('UNAUTHENTICATED');
  }
  const id = String(payload.sub || '');
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from('admin_accounts').select('id,email,display_name,role,status').eq('id', id).single();
  if (error || !data || data.status !== 'active') throw new Error('FORBIDDEN');
  if (roles && !roles.includes(data.role as PublicServiceRole)) throw new Error('FORBIDDEN');
  return { account: data as PublicServiceAccount, db };
}

export function publicServiceAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHENTICATED') return Response.json({ error: { code: message, message: 'Vui lòng đăng nhập để tiếp tục' } }, { status: 401 });
  if (message === 'FORBIDDEN') return Response.json({ error: { code: message, message: 'Bạn không có quyền thực hiện thao tác này' } }, { status: 403 });
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Có lỗi hệ thống' } }, { status: 500 });
}

export function hashOpaqueValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
