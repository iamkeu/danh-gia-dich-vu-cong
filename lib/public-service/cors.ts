import { NextResponse } from 'next/server';

export const miniAppCorsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'access-control-max-age': '600',
  vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
};

export function miniAppJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...miniAppCorsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function miniAppOptions() {
  return new NextResponse(null, { status: 204, headers: miniAppCorsHeaders });
}
