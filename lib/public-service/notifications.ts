import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/zalo/token-store';
import { uploadFile, sendFile, sendTextMessage } from '@/lib/zalo/client';
import { DEFAULT_NOTIFICATION_TEMPLATES, renderNotificationTemplate, type NotificationTemplateKey } from '@/lib/public-service/notification-templates';

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files';

export async function sendCase(caseId: string, actorId: string | null, onlyPart?: 'appointment_message' | 'appointment_file' | 'rating_invitation', actorRole?: string, messageTemplate?: NotificationTemplateKey) {
  const db = createSupabaseAdminClient();
  const { data: item, error } = await db.from('service_cases').select('id,case_code,status,pdf_storage_path,created_by,citizen_display_name,procedure_name,department_name,officer_name,appointment_date').eq('id', caseId).single();
  if (error || !item) throw new Error('CASE_NOT_FOUND');
  if (actorRole === 'operator' && item.created_by !== actorId) throw new Error('FORBIDDEN');
  const { data: link } = await db.from('service_case_links').select('oa_account_id,oa_uid_ciphertext').eq('case_id', caseId).single();
  if (!link?.oa_account_id || !link.oa_uid_ciphertext) throw new Error('CASE_NOT_LINKED');
  const { data: oa } = await db.from('zalo_oa_accounts').select('id').eq('id', link.oa_account_id).eq('is_active', true).single();
  if (!oa) throw new Error('OA_NOT_CONNECTED');
  const { data: savedTemplates } = await db.from('service_notification_templates').select('template_key,content').eq('oa_account_id', link.oa_account_id);
  const templates = { ...DEFAULT_NOTIFICATION_TEMPLATES } as Record<NotificationTemplateKey, string>;
  for (const saved of savedTemplates || []) if (saved.template_key in templates) templates[saved.template_key as NotificationTemplateKey] = saved.content;
  const uid = decryptToken(link.oa_uid_ciphertext);
  const parts: Array<'appointment_message' | 'appointment_file' | 'rating_invitation'> = onlyPart
    ? [onlyPart]
    : item.status === 'rated'
      ? ['appointment_message', 'appointment_file']
      : ['appointment_file', 'rating_invitation'];
  const renderedValues = { citizen_name: item.citizen_display_name, case_code: item.case_code, procedure_name: item.procedure_name, appointment_date: item.appointment_date, department_name: item.department_name, officer_name: item.officer_name };
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const miniAppUrl = process.env.ZALO_MINI_APP_ID
    ? `https://zalo.me/s/${process.env.ZALO_MINI_APP_ID}/?token=${encodeURIComponent(token)}`
    : `${process.env.NEXT_PUBLIC_APP_URL || ''}/miniapp?token=${encodeURIComponent(token)}`;
  for (const part of parts) {
    const key = `${caseId}:${part}`;
    try {
      const { data: previousAttempt } = await db.from('service_notification_attempts')
        .select('status')
        .eq('case_id', caseId)
        .eq('part', part)
        .eq('idempotency_key', key)
        .maybeSingle();
      if (previousAttempt?.status === 'sent') continue;

      if (part === 'rating_invitation' && item.status === 'rated') {
        await db.from('service_notification_attempts').upsert({ case_id: caseId, part, idempotency_key: key, status: 'skipped', error_code: 'RATING_ALREADY_SUBMITTED', error_message: 'Hồ sơ đã được đánh giá; không cần gửi lời mời đánh giá.', updated_at: new Date().toISOString() }, { onConflict: 'case_id,part,idempotency_key' });
        continue;
      }

      const claimedAt = new Date().toISOString();
      const claim = await db.from('service_notification_attempts').insert({ case_id: caseId, part, idempotency_key: key, status: 'processing', updated_at: claimedAt });
      if (claim.error?.code === '23505') {
        const { data: currentAttempt } = await db.from('service_notification_attempts').select('status,updated_at').eq('case_id', caseId).eq('part', part).eq('idempotency_key', key).maybeSingle();
        if (currentAttempt?.status === 'sent') continue;
        if (currentAttempt?.status === 'processing' && currentAttempt.updated_at && Date.now() - new Date(currentAttempt.updated_at).getTime() < 5 * 60 * 1000) continue;
        const { error: reclaimError } = await db.from('service_notification_attempts').update({ status: 'processing', updated_at: claimedAt }).eq('case_id', caseId).eq('part', part).eq('idempotency_key', key).eq('status', 'failed');
        if (reclaimError) throw reclaimError;
      } else if (claim.error) {
        throw claim.error;
      }
      let messageId = '';
      if (part === 'appointment_message') {
        const key = messageTemplate || (item.status === 'rated' ? 'resend_pdf' : 'post_rating');
        const sent = await sendTextMessage(oa.id, uid, renderNotificationTemplate(templates[key], renderedValues));
        messageId = String(sent.data?.message_id || sent.message_id || '');
      } else if (part === 'appointment_file') {
        if (!item.pdf_storage_path) throw new Error('PDF_NOT_UPLOADED');
        const { data: file, error: fileError } = await db.storage.from(bucket()).download(item.pdf_storage_path);
        if (fileError || !file) throw new Error('PDF_NOT_FOUND');
        const bytes = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadFile(oa.id, bytes, `${item.case_code}.pdf`, 'application/pdf');
        const sent = await sendFile(oa.id, uid, uploaded.data.token);
        messageId = String(sent.data?.message_id || sent.message_id || '');
      } else {
        const tokenInsert = await db.from('service_case_tokens').insert({ case_id: caseId, token_hash: tokenHash, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
        if (tokenInsert.error) throw tokenInsert.error;
        const invitation = `${renderNotificationTemplate(templates.rating_invitation, renderedValues)}\n\nMở Mini App: ${miniAppUrl}`;
        const sent = await sendTextMessage(oa.id, uid, invitation);
        messageId = String(sent.data?.message_id || sent.message_id || '');
      }
      await db.from('service_notification_attempts').update({ status: 'sent', message_id: messageId || null, retry_count: 0, error_code: null, error_message: null, updated_at: new Date().toISOString() }).eq('case_id', caseId).eq('part', part).eq('idempotency_key', key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.from('service_notification_attempts').update({ status: 'failed', retry_count: 1, error_code: message.split(':')[0], error_message: message, updated_at: new Date().toISOString() }).eq('case_id', caseId).eq('part', part).eq('idempotency_key', key);
    }
  }
  const { data: attempts } = await db.from('service_notification_attempts').select('part,status,retry_count,error_code,error_message,message_id,updated_at').eq('case_id', caseId).order('created_at', { ascending: false }).limit(20);
  const latest = new Map((attempts || []).map(a => [a.part, a.status]));
  const notificationStatus = latest.get('appointment_file') === 'sent' && latest.get('rating_invitation') === 'sent' ? 'sent' : latest.get('appointment_file') === 'failed' && latest.get('rating_invitation') === 'failed' ? 'draft' : 'linked';
  const status = item.status === 'rated' ? 'rated' : notificationStatus;
  const update = db.from('service_cases').update({ status, sent_at: status === 'sent' ? new Date().toISOString() : item.status === 'rated' ? undefined : null, updated_at: new Date().toISOString() }).eq('id', caseId).neq('status', 'rated');
  if (item.status !== 'rated') await update;
  const failedParts = (attempts || []).filter((attempt) => attempt.status === 'failed');
  await db.from('service_case_audit_logs').insert({ case_id: caseId, actor_account_id: actorId, action: 'case.notifications.processed', metadata: { onlyPart: onlyPart || null, status, sentParts: (attempts || []).filter((attempt) => attempt.status === 'sent').map((attempt) => attempt.part), failedParts: failedParts.map((attempt) => ({ part: attempt.part, code: attempt.error_code || null })) } });
  return { status, miniAppUrl, attempts: attempts || [], failedParts };
}
