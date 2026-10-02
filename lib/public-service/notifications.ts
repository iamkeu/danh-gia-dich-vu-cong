import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/zalo/token-store';
import { uploadFile, sendFile, sendVote } from '@/lib/zalo/client';

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files';

export async function sendCase(caseId: string, actorId: string, onlyPart?: 'appointment_file' | 'rating_invitation') {
  const db = createSupabaseAdminClient();
  const { data: item, error } = await db.from('service_cases').select('id,case_code,status,pdf_storage_path,rating_template_id,rating_template_data,created_by').eq('id', caseId).single();
  if (error || !item) throw new Error('CASE_NOT_FOUND');
  const { data: link } = await db.from('service_case_links').select('oa_account_id,oa_uid_ciphertext').eq('case_id', caseId).single();
  if (!link?.oa_account_id || !link.oa_uid_ciphertext) throw new Error('CASE_NOT_LINKED');
  const { data: oa } = await db.from('zalo_oa_accounts').select('id').eq('id', link.oa_account_id).eq('is_active', true).single();
  if (!oa) throw new Error('OA_NOT_CONNECTED');
  const uid = decryptToken(link.oa_uid_ciphertext);
  const parts: Array<'appointment_file' | 'rating_invitation'> = onlyPart ? [onlyPart] : ['appointment_file', 'rating_invitation'];
  let miniAppUrl = '';
  for (const part of parts) {
    const key = `${caseId}:${part}`;
    await db.from('service_notification_attempts').upsert({ case_id: caseId, part, idempotency_key: key, status: 'processing', updated_at: new Date().toISOString() }, { onConflict: 'case_id,part,idempotency_key' });
    try {
      let messageId = '';
      if (part === 'appointment_file') {
        if (!item.pdf_storage_path) throw new Error('PDF_NOT_UPLOADED');
        const { data: file, error: fileError } = await db.storage.from(bucket()).download(item.pdf_storage_path);
        if (fileError || !file) throw new Error('PDF_NOT_FOUND');
        const bytes = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadFile(oa.id, bytes, `${item.case_code}.pdf`, 'application/pdf');
        const sent = await sendFile(oa.id, uid, uploaded.data.token);
        messageId = String(sent.data?.message_id || sent.message_id || '');
      } else {
        if (!item.rating_template_id) throw new Error('RATING_TEMPLATE_NOT_CONFIGURED');
        const token = cryptoRandomToken();
        await db.from('service_case_tokens').delete().eq('case_id', caseId);
        const tokenInsert = await db.from('service_case_tokens').insert({ case_id: caseId, token_hash: token.hash, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
        if (tokenInsert.error) throw tokenInsert.error;
        miniAppUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/miniapp?token=${encodeURIComponent(token.raw)}`;
        const data = { ...(item.rating_template_data || {}), rating_url: miniAppUrl, miniapp_url: miniAppUrl } as Record<string, string>;
        const sent = await sendVote(oa.id, uid, item.rating_template_id || '', data);
        messageId = String(sent.data?.message_id || sent.message_id || '');
      }
      await db.from('service_notification_attempts').update({ status: 'sent', message_id: messageId || null, retry_count: 0, error_code: null, error_message: null, updated_at: new Date().toISOString() }).eq('case_id', caseId).eq('part', part).eq('idempotency_key', key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.from('service_notification_attempts').update({ status: 'failed', retry_count: 1, error_code: message.split(':')[0], error_message: message, updated_at: new Date().toISOString() }).eq('case_id', caseId).eq('part', part).eq('idempotency_key', key);
    }
  }
  const { data: attempts } = await db.from('service_notification_attempts').select('part,status').eq('case_id', caseId).order('created_at', { ascending: false }).limit(20);
  const latest = new Map((attempts || []).map(a => [a.part, a.status]));
  const status = latest.get('appointment_file') === 'sent' && latest.get('rating_invitation') === 'sent' ? 'sent' : latest.get('appointment_file') === 'failed' && latest.get('rating_invitation') === 'failed' ? 'draft' : 'linked';
  await db.from('service_cases').update({ status, sent_at: status === 'sent' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', caseId);
  await db.from('service_case_audit_logs').insert({ case_id: caseId, actor_account_id: actorId, action: 'case.notifications.processed', metadata: { onlyPart: onlyPart || null, status } });
  return { status, miniAppUrl, attempts: attempts || [] };
}

function cryptoRandomToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: createHash('sha256').update(raw).digest('hex') };
}
