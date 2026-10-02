import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashOpaqueValue, publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

const linkSchema = z.object({ oaUid: z.string().trim().min(1).max(200), oaAccountId: z.string().uuid().nullable().optional(), method: z.enum(['auto', 'manual']).default('manual') });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin', 'operator']);
    const body = linkSchema.parse(await request.json());
    const { data: serviceCase, error: caseError } = await db.from('service_cases').select('id,status,created_by').eq('id', params.id).single();
    if (caseError || !serviceCase) return NextResponse.json({ error: { code: 'CASE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } }, { status: 404 });
    if (account.role === 'operator' && serviceCase.created_by !== account.id) return publicServiceAuthError(new Error('FORBIDDEN'));
    const { data: link, error } = await db.from('service_case_links').upsert({ case_id: params.id, oa_account_id: body.oaAccountId ?? null, oa_uid_hash: hashOpaqueValue(body.oaUid), link_method: body.method, linked_by: account.id }, { onConflict: 'case_id' }).select('id,case_id,oa_account_id,link_method,linked_at').single();
    if (error) throw error;
    await db.from('service_cases').update({ status: 'linked', updated_at: new Date().toISOString() }).eq('id', params.id);
    await db.from('service_case_audit_logs').insert({ case_id: params.id, actor_account_id: account.id, action: 'case.oa_linked', metadata: { method: body.method, oaAccountId: body.oaAccountId ?? null } });
    return NextResponse.json({ data: link });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Dữ liệu không hợp lệ' } }, { status: 400 });
    return publicServiceAuthError(error);
  }
}
