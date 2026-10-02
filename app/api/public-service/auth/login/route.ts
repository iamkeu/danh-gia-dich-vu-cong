import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không hợp lệ' } }, { status: 400 });
    }
    const db = createSupabaseAdminClient();
    const { data, error } = await db.from('admin_accounts').select('id,email,display_name,password_hash,role,status').eq('email', email).single();
    if (error || !data || data.status !== 'active' || !verifyPassword(password, data.password_hash)) {
      return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' } }, { status: 401 });
    }
    await createSession(data);
    return NextResponse.json({ data: { id: data.id, email: data.email, displayName: data.display_name, role: data.role } });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể đăng nhập' } }, { status: 500 });
  }
}
