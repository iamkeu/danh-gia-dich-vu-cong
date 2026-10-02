import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/public-service/auth';
import { requirePublicServiceAccount, publicServiceAuthError, type PublicServiceRole } from '@/lib/public-service/auth';

const roles: PublicServiceRole[] = ['admin', 'leader', 'operator'];
const statuses = ['pending', 'active', 'suspended'] as const;

export async function GET() {
  try { const { account, db } = await requirePublicServiceAccount(['admin']); const { data, error } = await db.from('admin_accounts').select('id,email,display_name,role,status,created_at,updated_at').order('created_at', { ascending: false }).limit(100); if (error) throw error; return NextResponse.json({ data: data || [], currentAccountId: account.id }); } catch (e) { return publicServiceAuthError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin']); const body = await req.json(); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || ''); const displayName = String(body.display_name || '').trim(); const role = body.role as PublicServiceRole; const status = (body.status || 'active') as typeof statuses[number];
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Email hợp lệ và mật khẩu tối thiểu 8 ký tự là bắt buộc' } }, { status: 400 });
    if (!roles.includes(role) || !statuses.includes(status)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Role hoặc trạng thái không hợp lệ' } }, { status: 400 });
    const { data, error } = await db.from('admin_accounts').insert({ email, password_hash: hashPassword(password), display_name: displayName || email.split('@')[0], role, status }).select('id,email,display_name,role,status,created_at,updated_at').single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: { code: 'DUPLICATE_EMAIL', message: 'Email đã tồn tại trong hệ thống' } }, { status: 409 }); throw error; }
    await db.from('service_case_audit_logs').insert({ actor_account_id: account.id, action: 'admin_account.created', metadata: { email, role, status } }); return NextResponse.json({ data }, { status: 201 });
  } catch (e) { return publicServiceAuthError(e); }
}
