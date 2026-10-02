import { NextRequest, NextResponse } from 'next/server';
import { requirePublicServiceAccount, publicServiceAuthError } from '@/lib/public-service/auth';
import { sendCase } from '@/lib/public-service/notifications';
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try { const { account } = await requirePublicServiceAccount(['admin', 'operator']); const body = await request.json(); if (!['appointment_file', 'rating_invitation'].includes(body.part)) return NextResponse.json({ error: { code: 'INVALID_PART', message: 'Phần retry không hợp lệ' } }, { status: 400 }); const result = await sendCase(params.id, account.id, body.part); return NextResponse.json({ data: result }); } catch (error) { return publicServiceAuthError(error); }
}
