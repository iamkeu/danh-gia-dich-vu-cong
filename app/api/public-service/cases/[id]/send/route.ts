import { NextRequest, NextResponse } from 'next/server';
import { requirePublicServiceAccount, publicServiceAuthError } from '@/lib/public-service/auth';
import { sendCase } from '@/lib/public-service/notifications';
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try { const { account } = await requirePublicServiceAccount(['admin', 'operator']); const body = await request.json().catch(() => ({})); const result = await sendCase(params.id, account.id, body.part); return NextResponse.json({ data: result }); } catch (error) { return publicServiceAuthError(error); }
}
