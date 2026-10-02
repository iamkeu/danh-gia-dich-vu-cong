import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('<!doctype html><html><head><meta name="zalo-platform-site-verification" content="EiQV0i3CCXytxxa1zkKD01VgWLhxd5e5DJ8q" /></head><body>zalo_verifierPSMZ8B3742mxnh4uulDbDGVivJRhcZvfDJas</body></html>', {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
