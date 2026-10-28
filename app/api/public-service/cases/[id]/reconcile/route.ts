import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/zalo/token-store';
import { getConversation } from '@/lib/zalo/client';
import { publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

type AnyRecord = Record<string, unknown>;

function findMessages(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value.flatMap(findMessages);
  if (!value || typeof value !== 'object') return [];
  const item = value as AnyRecord;
  const found = typeof item.message_id === 'string' || typeof item.msg_id === 'string' ? [item] : [];
  return [...found, ...Object.values(item).flatMap(findMessages)];
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { account } = await requirePublicServiceAccount(['admin', 'operator']);
    const db = createSupabaseAdminClient();
    const { data: item, error: caseError } = await db.from('service_cases').select('id,case_code,created_by').eq('id', params.id).single();
    if (caseError || !item) return NextResponse.json({ error: { code: 'CASE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } }, { status: 404 });
    if (account.role === 'operator' && item.created_by !== account.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bạn không có quyền đối soát hồ sơ này' } }, { status: 403 });
    const { data: link } = await db.from('service_case_links').select('oa_account_id,oa_uid_ciphertext').eq('case_id', params.id).single();
    if (!link?.oa_account_id || !link.oa_uid_ciphertext) return NextResponse.json({ error: { code: 'CASE_NOT_LINKED', message: 'Hồ sơ chưa có liên kết Zalo' } }, { status: 409 });
    const { data: attempts } = await db.from('service_notification_attempts').select('id,message_id,status,updated_at').eq('case_id', params.id).eq('part', 'appointment_file').eq('status', 'sent').order('updated_at', { ascending: false }).limit(10);
    const target = attempts?.find(attempt => attempt.message_id);
    if (!target?.message_id) return NextResponse.json({ error: { code: 'NO_SENT_MESSAGE', message: 'Hồ sơ chưa có message_id PDF để đối soát' } }, { status: 409 });
    const conversation = await getConversation(link.oa_account_id, decryptToken(link.oa_uid_ciphertext), 0, 10);
    const messages = findMessages(conversation);
    const match = messages.find(message => String(message.message_id || message.msg_id) === String(target.message_id));
    const now = new Date().toISOString();
    const reconciliationStatus = match ? 'found' : 'not_found';
    const reconciliationError = match ? null : 'Không tìm thấy message_id trong 10 tin nhắn gần nhất; đây chưa phải bằng chứng tin bị thất bại.';
    await db.from('service_notification_attempts').update({ reconciliation_status: reconciliationStatus, reconciled_at: now, reconciled_message_id: match ? target.message_id : null, reconciliation_error: reconciliationError }).eq('id', target.id);
    await db.from('service_case_audit_logs').insert({ case_id: params.id, actor_account_id: account.id, action: 'case.oa_message_reconciled', metadata: { messageId: target.message_id, status: reconciliationStatus, checkedCount: messages.length, window: 10 } });
    return NextResponse.json({ data: { caseCode: item.case_code, messageId: target.message_id, status: reconciliationStatus, checkedCount: messages.length, matchedMessage: match || null, note: reconciliationError } });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}
