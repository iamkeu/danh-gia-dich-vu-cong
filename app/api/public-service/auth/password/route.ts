import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, publicServiceAuthError, requirePublicServiceAccount, verifyPassword } from '@/lib/public-service/auth';

export async function POST(request: NextRequest) {
  try {
    const { account, db } = await requirePublicServiceAccount();
    const body = await request.json();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (newPassword.length < 8) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' } }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' } }, { status: 400 });
    }

    const { data, error } = await db.from('admin_accounts').select('password_hash').eq('id', account.id).single();
    if (error || !data || !verifyPassword(currentPassword, data.password_hash)) {
      return NextResponse.json({ error: { code: 'INVALID_PASSWORD', message: 'Mật khẩu hiện tại không đúng.' } }, { status: 400 });
    }

    const { error: updateError } = await db.from('admin_accounts').update({ password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() }).eq('id', account.id);
    if (updateError) throw updateError;
    await db.from('service_case_audit_logs').insert({ actor_account_id: account.id, action: 'admin_account.password_changed', metadata: { selfService: true } });
    return NextResponse.json({ data: { changed: true } });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}
