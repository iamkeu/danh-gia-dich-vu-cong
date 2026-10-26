import { hashOpaqueValue } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { miniAppOptions } from '@/lib/public-service/cors';

export function OPTIONS() {
  return miniAppOptions();
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 20) {
    return new Response('Liên kết không hợp lệ', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const db = createSupabaseAdminClient();
  const { data: token } = await db
    .from('service_case_tokens')
    .select('case_id,expires_at,consumed_at')
    .eq('token_hash', hashOpaqueValue(params.token))
    .single();

  if (!token || token.consumed_at || new Date(token.expires_at).getTime() < Date.now()) {
    return new Response('Liên kết hồ sơ đã hết hạn', { status: 410, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const { data: serviceCase } = await db
    .from('service_cases')
    .select('case_code,pdf_storage_path')
    .eq('id', token.case_id)
    .single();

  if (!serviceCase?.pdf_storage_path) {
    return new Response('Hồ sơ chưa có giấy hẹn PDF', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files';
  const { data: file, error } = await db.storage.from(bucket).download(serviceCase.pdf_storage_path);
  if (error || !file) {
    return new Response('Không thể tải giấy hẹn PDF', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const filename = `${String(serviceCase.case_code || 'giay-hen').replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;
  return new Response(file.stream(), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    },
  });
}
