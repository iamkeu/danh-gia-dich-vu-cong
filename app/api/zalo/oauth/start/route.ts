import { NextResponse } from 'next/server';
import { requireUser, authError } from '@/lib/authz';
import { createCodeChallenge, createPkceCookie, createPkceSession } from '@/lib/zalo/pkce';

export async function GET() {
  try {
    await requireUser(['admin']);
    if (!process.env.ZALO_APP_ID || !process.env.OAUTH_CALLBACK_URL) throw new Error('ZALO_OAUTH_NOT_CONFIGURED');
    const session = createPkceSession();
    const u = new URL('https://oauth.zaloapp.com/v4/oa/permission');
    u.searchParams.set('app_id', process.env.ZALO_APP_ID);
    u.searchParams.set('redirect_uri', process.env.OAUTH_CALLBACK_URL);
    u.searchParams.set('state', session.state);
    u.searchParams.set('code_challenge', createCodeChallenge(session.verifier));
    u.searchParams.set('code_challenge_method', 'S256');
    const response = NextResponse.json({ data: { url: u.toString() } });
    const cookie = createPkceCookie(session);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (e) {
    return authError(e);
  }
}
