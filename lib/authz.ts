import { requirePublicServiceAccount } from '@/lib/public-service/auth';
export type AppRole = 'admin' | 'operator' | 'viewer';
export async function requireUser(roles?: AppRole[]) {
  const { account, db } = await requirePublicServiceAccount();
  const role: AppRole = account.role === 'leader' ? 'viewer' : account.role;
  if (roles && !roles.includes(role) && !(role === 'admin' && roles.length > 0)) throw new Error('FORBIDDEN');
  const user = { id: account.id, email: account.email, user_metadata: { full_name: account.display_name }, app_metadata: { provider: 'password' } };
  const profile = { id: account.id, email: account.email, display_name: account.display_name, role, status: account.status };
  return { user, profile, supabase: db };
}
export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  if (message === 'UNAUTHENTICATED') return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Đăng nhập để tiếp tục' } }, { status: 401 });
  if (message === 'FORBIDDEN') return Response.json({ error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này' } }, { status: 403 });
  if (['INVALID_OAUTH_STATE', 'MISSING_PKCE_SESSION', 'INVALID_PKCE_SESSION', 'EXPIRED_PKCE_SESSION'].includes(message)) return Response.json({ error: { code: 'INVALID_OAUTH_SESSION', message: 'Phiên cấp quyền Zalo không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' } }, { status: 400 });
  if (message.startsWith('ZALO_')) return Response.json({ error: { code: 'ZALO_API_ERROR', message } }, { status: 502 });
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Có lỗi hệ thống' } }, { status: 500 });
}
