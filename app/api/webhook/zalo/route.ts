import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { hashOpaqueValue } from '@/lib/public-service/auth';

function equalSignature(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const signature = req.headers.get('x-zevent-signature') || '';
  const appIds = Array.from(new Set([String(process.env.ZALO_APP_ID || ''), String(body.app_id || '')].filter(Boolean)));
  const validSignature = appIds.some(appId => {
    const expected = crypto.createHash('sha256').update(`${appId}${raw}${body.timestamp || ''}${process.env.OA_WEBHOOK_SECRET || ''}`).digest('hex');
    return equalSignature(signature, expected);
  });
  if (!validSignature) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });

  const db = createSupabaseAdminClient();
  const message = body.message || body.data || {};
  const messageId = String(message.msg_id || message.message_id || body.message_id || '');
  const eventName = String(body.event_name || body.event || '');
  if (messageId) {
    const { data: attempt } = await db.from('service_notification_attempts').select('id,case_id,message_id').eq('message_id', messageId).maybeSingle();
    if (attempt?.id) {
      await db.from('service_notification_attempts').update({ reconciliation_status: 'webhook_received', reconciled_at: new Date().toISOString(), reconciled_message_id: messageId, reconciliation_error: null }).eq('id', attempt.id);
      await db.from('service_case_audit_logs').insert({ case_id: attempt.case_id, actor_account_id: null, action: 'case.oa_message_webhook_received', metadata: { eventName, messageId } });
    }
  }
  if (eventName.includes('feedback') || eventName.includes('rating') || message.rating !== undefined || message.rating_score !== undefined) {
    const stars = Number(message.rating ?? message.rating_score ?? message.stars);
    const comment = String(message.comment ?? message.feedback ?? '').trim();
    const uid = String(message.user_id ?? message.uid ?? message.from?.id ?? '');
    if (Number.isInteger(stars) && stars >= 1 && stars <= 5) {
      const { data: attempt } = await db.from('service_notification_attempts').select('case_id').eq('part', 'rating_invitation').eq('message_id', messageId).maybeSingle();
      if (attempt?.case_id) {
        const { data: link } = await db.from('service_case_links').select('oa_uid_hash').eq('case_id', attempt.case_id).single();
        const oaUidHash = uid ? hashOpaqueValue(uid) : link?.oa_uid_hash;
        if (oaUidHash) {
          const { error } = await db.from('service_ratings').insert({ case_id: attempt.case_id, oa_uid_hash: oaUidHash, stars, comment: comment || null, comment_consent_at: comment ? new Date().toISOString() : null });
          if (!error || error.code === '23505') {
            await db.from('service_cases').update({ status: 'rated', updated_at: new Date().toISOString() }).eq('id', attempt.case_id);
            await db.from('service_case_audit_logs').insert({ case_id: attempt.case_id, action: 'rating.webhook.received', metadata: { messageId, stars } });
          }
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}
