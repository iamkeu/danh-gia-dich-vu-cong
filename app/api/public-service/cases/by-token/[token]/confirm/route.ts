import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashOpaqueValue } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/zalo/token-store';

const schema = z.object({
  oaUid: z.string().trim().min(1).max(200),
  oaAccountId: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    if (!params.token || params.token.length < 20) {
      return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Liên kết hồ sơ không hợp lệ' } }, { status: 400 });
    }
    const body = schema.parse(await request.json());
    const db = createSupabaseAdminClient();
    const tokenHash = hashOpaqueValue(params.token);
    const { data: token } = await db.from('service_case_tokens').select('case_id,expires_at,consumed_at').eq('token_hash', tokenHash).single();
    if (!token || token.consumed_at || new Date(token.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: { code: 'TOKEN_EXPIRED', message: 'Liên kết hồ sơ đã hết hạn' } }, { status: 410 });
    }

    const { data: existing } = await db.from('service_case_links').select('oa_uid_hash,linked_at').eq('case_id', token.case_id).maybeSingle();
    const oaUidHash = hashOpaqueValue(body.oaUid);
    if (existing && existing.oa_uid_hash !== oaUidHash) {
      return NextResponse.json({ error: { code: 'CASE_ALREADY_LINKED', message: 'Hồ sơ đã được liên kết với một tài khoản Zalo khác' } }, { status: 409 });
    }

    let oaAccountId = body.oaAccountId ?? null;
    if (!oaAccountId) {
      const { data: activeOa } = await db.from('zalo_oa_accounts').select('id').eq('is_active', true).maybeSingle();
      oaAccountId = activeOa?.id || null;
    }
    const { data: link, error } = await db.from('service_case_links').upsert({
      case_id: token.case_id,
      oa_account_id: oaAccountId,
      oa_uid_hash: oaUidHash,
      oa_uid_ciphertext: encryptToken(body.oaUid),
      link_method: 'citizen_qr',
      confirmation_method: 'citizen_qr',
      confirmed_at: new Date().toISOString(),
      linked_by: null,
    }, { onConflict: 'case_id' }).select('id,case_id,link_method,confirmation_method,confirmed_at,linked_at').single();
    if (error) throw error;

    await db.from('service_cases').update({ status: 'linked', updated_at: new Date().toISOString() }).eq('id', token.case_id);
    await db.from('service_case_audit_logs').insert({ case_id: token.case_id, actor_account_id: null, action: 'case.citizen_confirmed_result', metadata: { method: 'citizen_qr', oaAccountId } });
    return NextResponse.json({ data: { ...link, message: 'Đã xác nhận nhận kết quả hồ sơ qua Zalo' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Dữ liệu không hợp lệ' } }, { status: 400 });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể xác nhận hồ sơ' } }, { status: 500 });
  }
}
