import { NextRequest, NextResponse } from 'next/server';
import { requirePublicServiceAccount, publicServiceAuthError } from '@/lib/public-service/auth';

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files';
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin', 'operator']);
    const { data: item } = await db.from('service_cases').select('id,created_by,case_code').eq('id', params.id).single();
    if (!item || (account.role === 'operator' && item.created_by !== account.id)) return NextResponse.json({ error: { code: 'CASE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } }, { status: 404 });
    const form = await request.formData(); const file = form.get('file');
    if (!(file instanceof File) || file.type !== 'application/pdf' || file.size <= 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: { code: 'INVALID_PDF', message: 'Chỉ nhận PDF tối đa 5 MB' } }, { status: 400 });
    const path = `cases/${params.id}/${Date.now()}-${item.case_code}.pdf`;
    const { error: uploadError } = await db.storage.from(bucket()).upload(path, file, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    const { data, error } = await db.from('service_cases').update({ pdf_storage_path: path, updated_at: new Date().toISOString() }).eq('id', params.id).select('id,pdf_storage_path').single();
    if (error) throw error;
    await db.from('service_case_audit_logs').insert({ case_id: params.id, actor_account_id: account.id, action: 'case.pdf_uploaded', metadata: { size: file.size } });
    return NextResponse.json({ data });
  } catch (error) { return publicServiceAuthError(error); }
}
