import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hashOpaqueValue } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/zalo/token-store';
import { miniAppJson, miniAppOptions } from '@/lib/public-service/cors';
import { sendCase } from '@/lib/public-service/notifications';

const schema = z.object({
  oaUid: z.string().trim().min(1).max(200),
  followedOA: z.boolean(),
  oaAccountId: z.string().uuid().nullable().optional(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(''),
  commentConsent: z.boolean().default(false),
});

async function autoSendAppointment(caseId: string) {
  try {
    const result = await sendCase(caseId, null, 'appointment_file');
    return { status: result.failedParts.length ? 'failed' : 'sent', failedParts: result.failedParts };
  } catch (error) {
    console.error('citizen_auto_oa_send_failed', { caseId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'failed', failedParts: [{ part: 'appointment_file', error_code: error instanceof Error ? error.message.split(':')[0] : 'AUTO_OA_SEND_FAILED' }] };
  }
}

export function OPTIONS() {
  return miniAppOptions();
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    if (!params.token || params.token.length < 20) {
      return miniAppJson({ error: { code: 'INVALID_TOKEN', message: 'Liên kết hồ sơ không hợp lệ' } }, { status: 400 });
    }
    const body = schema.parse(await request.json());
    const comment = body.comment.trim();
    if (!body.followedOA) return miniAppJson({ error: { code: 'OA_FOLLOW_REQUIRED', message: 'Vui lòng quan tâm Official Account trước khi gửi phản hồi để nhận giấy hẹn qua Zalo.' } }, { status: 403 });
    if (comment && !body.commentConsent) {
      return miniAppJson({ error: { code: 'COMMENT_CONSENT_REQUIRED', message: 'Vui lòng đồng ý trước khi gửi góp ý' } }, { status: 400 });
    }
    const db = createSupabaseAdminClient();
    const tokenHash = hashOpaqueValue(params.token);
    const { data: token } = await db.from('service_case_tokens').select('case_id,expires_at,consumed_at').eq('token_hash', tokenHash).single();
    if (!token || token.consumed_at || new Date(token.expires_at).getTime() < Date.now()) {
      return miniAppJson({ error: { code: 'TOKEN_EXPIRED', message: 'Liên kết hồ sơ đã hết hạn' } }, { status: 410 });
    }

    const { data: existing } = await db.from('service_case_links').select('oa_uid_hash,linked_at').eq('case_id', token.case_id).maybeSingle();
    const oaUidHash = hashOpaqueValue(body.oaUid);
    if (existing && existing.oa_uid_hash !== oaUidHash) {
      return miniAppJson({ error: { code: 'CASE_ALREADY_LINKED', message: 'Hồ sơ đã được liên kết với một tài khoản Zalo khác' } }, { status: 409 });
    }

    let oaAccountId = body.oaAccountId ?? null;
    if (!oaAccountId) {
      const { data: activeOa } = await db.from('zalo_oa_accounts').select('id').eq('is_active', true).maybeSingle();
      oaAccountId = activeOa?.id || null;
    }
    const { data: existingRating } = await db.from('service_ratings').select('id,stars,submitted_at').eq('case_id', token.case_id).maybeSingle();
    if (existingRating) {
      await db.from('service_cases').update({ status: 'rated', updated_at: new Date().toISOString() }).eq('id', token.case_id);
      const notification = await autoSendAppointment(token.case_id);
      await db.from('service_case_audit_logs').insert({ case_id: token.case_id, actor_account_id: null, action: 'case.oa_auto_send_after_rating', metadata: { status: notification.status, failedParts: notification.failedParts, retry: true } });
      return miniAppJson({ data: { rating: existingRating, notification, message: 'Hồ sơ này đã được xác nhận và gửi phản hồi trước đó' } }, { status: 200 });
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
    if (error) {
      console.error('citizen_confirm_link_save_failed', { caseId: token.case_id, code: error.code, message: error.message });
      return miniAppJson({ error: { code: 'LINK_SAVE_FAILED', message: 'Chưa thể ghi nhận liên kết hồ sơ. Vui lòng thử lại.' } }, { status: 503 });
    }

    const { data: rating, error: ratingError } = await db.from('service_ratings').insert({
      case_id: token.case_id,
      oa_uid_hash: oaUidHash,
      stars: body.stars,
      comment: comment || null,
      comment_consent_at: comment ? new Date().toISOString() : null,
    }).select('id,stars,submitted_at').single();
    if (ratingError) {
      if (ratingError.code === '23505') return miniAppJson({ error: { code: 'ALREADY_RATED', message: 'Hồ sơ này đã được đánh giá' } }, { status: 409 });
      console.error('citizen_confirm_rating_save_failed', { caseId: token.case_id, code: ratingError.code, message: ratingError.message });
      return miniAppJson({ error: { code: 'RATING_SAVE_FAILED', message: 'Đã liên kết hồ sơ nhưng chưa ghi được đánh giá. Vui lòng bấm gửi lại.' } }, { status: 503 });
    }

    const { error: statusError } = await db.from('service_cases').update({ status: 'rated', updated_at: new Date().toISOString() }).eq('id', token.case_id);
    if (statusError) console.error('citizen_confirm_status_update_failed', { caseId: token.case_id, code: statusError.code, message: statusError.message });
    await db.from('service_case_audit_logs').insert({ case_id: token.case_id, actor_account_id: null, action: 'case.citizen_confirmed_and_rated', metadata: { method: 'citizen_qr', oaAccountId, stars: body.stars, hasComment: Boolean(comment) } });
    const notification = await autoSendAppointment(token.case_id);
    await db.from('service_case_audit_logs').insert({ case_id: token.case_id, actor_account_id: null, action: 'case.oa_auto_send_after_rating', metadata: { status: notification.status, failedParts: notification.failedParts } });
    return miniAppJson({ data: { ...link, rating, notification, message: 'Đã xác nhận và gửi phản hồi thành công' } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return miniAppJson({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Dữ liệu không hợp lệ' } }, { status: 400 });
    console.error('citizen_confirm_unhandled_error', error);
    return miniAppJson({ error: { code: 'INTERNAL_ERROR', message: 'Không thể xác nhận hồ sơ' } }, { status: 500 });
  }
}
