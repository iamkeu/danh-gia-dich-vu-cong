import { NextRequest, NextResponse } from 'next/server';
import { requirePublicServiceAccount, publicServiceAuthError } from '@/lib/public-service/auth';

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin', 'operator']);
    const { data: item, error: lookupError } = await db
      .from('service_cases')
      .select('id,case_code,created_by,pdf_storage_path')
      .eq('id', params.id)
      .single();

    if (lookupError || !item || (account.role === 'operator' && item.created_by !== account.id)) {
      return NextResponse.json({ error: { code: 'CASE_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc bạn không có quyền xóa hồ sơ này' } }, { status: 404 });
    }

    await db.from('service_case_audit_logs').insert({
      case_id: item.id,
      actor_account_id: account.id,
      action: 'case.deleted',
      metadata: { caseCode: item.case_code, deletedByRole: account.role },
    });

    const { error: deleteError } = await db.from('service_cases').delete().eq('id', item.id);
    if (deleteError) throw deleteError;

    if (item.pdf_storage_path) {
      const { error: storageError } = await db.storage.from(bucket()).remove([item.pdf_storage_path]);
      if (storageError) console.error('case_pdf_cleanup_failed', { caseId: item.id, message: storageError.message });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}
