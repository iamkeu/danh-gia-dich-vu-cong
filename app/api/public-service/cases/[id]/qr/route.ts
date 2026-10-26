import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { hashOpaqueValue, publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

function miniAppUrl(token: string) {
  const appId = process.env.ZALO_MINI_APP_ID;
  const base = appId ? `https://zalo.me/s/${appId}/` : `${process.env.NEXT_PUBLIC_APP_URL || ''}/miniapp`;
  return `${base}?token=${encodeURIComponent(token)}`;
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin', 'operator']);
    const { data: serviceCase, error: caseError } = await db.from('service_cases').select('id,case_code,created_by').eq('id', params.id).single();
    if (caseError || !serviceCase) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ.' } }, { status: 404 });
    if (account.role === 'operator' && serviceCase.created_by !== account.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem hồ sơ này.' } }, { status: 403 });

    const token = randomBytes(32).toString('base64url');
    const { error: tokenError } = await db.from('service_case_tokens').insert({ case_id: params.id, token_hash: hashOpaqueValue(token), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
    if (tokenError) throw tokenError;
    await db.from('service_case_audit_logs').insert({ case_id: params.id, actor_account_id: account.id, action: 'case.qr_regenerated', metadata: { caseCode: serviceCase.case_code } });
    return NextResponse.json({ data: { caseId: params.id, caseCode: serviceCase.case_code, miniAppUrl: miniAppUrl(token) } });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}
