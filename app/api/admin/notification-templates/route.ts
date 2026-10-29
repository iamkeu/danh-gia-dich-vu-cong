import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePublicServiceAccount, publicServiceAuthError } from '@/lib/public-service/auth';
import { DEFAULT_NOTIFICATION_TEMPLATES, TEMPLATE_LABELS, TEMPLATE_VARIABLES, type NotificationTemplateKey } from '@/lib/public-service/notification-templates';

const keys = Object.keys(DEFAULT_NOTIFICATION_TEMPLATES) as NotificationTemplateKey[];
const templateSchema = z.object({
  post_rating: z.string().trim().min(1).max(4000),
  rating_invitation: z.string().trim().min(1).max(4000),
  resend_pdf: z.string().trim().min(1).max(4000),
});

async function getContext() {
  const { account, db } = await requirePublicServiceAccount(['admin']);
  const { data: oa } = await db.from('zalo_oa_accounts').select('id,oa_id,oa_name').eq('is_active', true).maybeSingle();
  return { account, db, oa };
}

export async function GET() {
  try {
    const { db, oa } = await getContext();
    const merged = { ...DEFAULT_NOTIFICATION_TEMPLATES } as Record<NotificationTemplateKey, string>;
    let updatedAt: string | null = null;
    if (oa) {
      const { data } = await db.from('service_notification_templates').select('template_key,content,updated_at').eq('oa_account_id', oa.id);
      for (const row of data || []) if (row.template_key in merged) { merged[row.template_key as NotificationTemplateKey] = row.content; updatedAt = row.updated_at || updatedAt; }
    }
    return NextResponse.json({ data: { oa: oa ? { id: oa.id, oa_id: oa.oa_id, oa_name: oa.oa_name } : null, templates: keys.map(key => ({ key, ...TEMPLATE_LABELS[key], content: merged[key] })), variables: TEMPLATE_VARIABLES, updatedAt } });
  } catch (error) { return publicServiceAuthError(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const { account, db, oa } = await getContext();
    if (!oa) return NextResponse.json({ error: { code: 'OA_NOT_CONNECTED', message: 'Hãy kết nối Zalo OA trước khi lưu mẫu tin.' } }, { status: 409 });
    const body = templateSchema.parse(await request.json());
    const rows = keys.map(key => ({ oa_account_id: oa.id, template_key: key, content: body[key], updated_by: account.id, updated_at: new Date().toISOString() }));
    const { error } = await db.from('service_notification_templates').upsert(rows, { onConflict: 'oa_account_id,template_key' });
    if (error) throw error;
    await db.from('service_case_audit_logs').insert({ actor_account_id: account.id, action: 'settings.oa_templates_updated', metadata: { oaId: oa.oa_id, templateKeys: keys } });
    return NextResponse.json({ data: { saved: true, message: 'Đã lưu mẫu tin OA.' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Nội dung mẫu tin không hợp lệ hoặc vượt quá 4.000 ký tự.' } }, { status: 400 });
    return publicServiceAuthError(error);
  }
}
