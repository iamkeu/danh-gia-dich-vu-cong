import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashOpaqueValue } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const ratingSchema = z.object({
  token: z.string().min(20),
  oaUid: z.string().trim().min(1).max(200),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(''),
  commentConsent: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = ratingSchema.parse(await request.json());
    const comment = body.comment.trim();
    if (comment && !body.commentConsent) return NextResponse.json({ error: { code: 'COMMENT_CONSENT_REQUIRED', message: 'Vui lòng đồng ý trước khi gửi góp ý' } }, { status: 400 });
    const db = createSupabaseAdminClient();
    const { data: token } = await db.from('service_case_tokens').select('case_id,expires_at,consumed_at').eq('token_hash', hashOpaqueValue(body.token)).single();
    if (!token || token.consumed_at || new Date(token.expires_at).getTime() < Date.now()) return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Liên kết hồ sơ không hợp lệ hoặc đã hết hạn' } }, { status: 410 });
    const oaUidHash = hashOpaqueValue(body.oaUid);
    const { data: link } = await db.from('service_case_links').select('id').eq('case_id', token.case_id).eq('oa_uid_hash', oaUidHash).maybeSingle();
    if (!link) return NextResponse.json({ error: { code: 'IDENTITY_NOT_LINKED', message: 'Tài khoản Zalo chưa được liên kết với hồ sơ này' } }, { status: 403 });
    const { data: rating, error } = await db.from('service_ratings').insert({ case_id: token.case_id, oa_uid_hash: oaUidHash, stars: body.stars, comment: comment || null, comment_consent_at: comment ? new Date().toISOString() : null }).select('id,stars,submitted_at').single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: { code: 'ALREADY_RATED', message: 'Hồ sơ này đã được đánh giá' } }, { status: 409 });
      throw error;
    }
    await db.from('service_cases').update({ status: 'rated', updated_at: new Date().toISOString() }).eq('id', token.case_id);
    await db.from('service_case_audit_logs').insert({ case_id: token.case_id, action: 'rating.submitted', metadata: { stars: body.stars, hasComment: Boolean(comment) } });
    return NextResponse.json({ data: { ...rating, message: 'Ý kiến của Anh/Chị đã được ghi nhận' } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Dữ liệu không hợp lệ' } }, { status: 400 });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể ghi nhận đánh giá' } }, { status: 500 });
  }
}
