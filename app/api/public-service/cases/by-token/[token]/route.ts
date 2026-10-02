import { NextResponse } from 'next/server';
import { hashOpaqueValue } from '@/lib/public-service/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 20) return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Liên kết không hợp lệ' } }, { status: 400 });
  const db = createSupabaseAdminClient();
  const { data: token, error: tokenError } = await db.from('service_case_tokens').select('case_id,expires_at,consumed_at').eq('token_hash', hashOpaqueValue(params.token)).single();
  if (tokenError || !token || token.consumed_at || new Date(token.expires_at).getTime() < Date.now()) return NextResponse.json({ error: { code: 'TOKEN_EXPIRED', message: 'Liên kết hồ sơ đã hết hạn' } }, { status: 410 });
  const { data: serviceCase, error } = await db.from('service_cases').select('id,case_code,procedure_name,department_name,officer_name,appointment_date,status,pdf_storage_path').eq('id', token.case_id).single();
  if (error || !serviceCase) return NextResponse.json({ error: { code: 'CASE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } }, { status: 404 });
  const { data: rating } = await db.from('service_ratings').select('id,stars,submitted_at').eq('case_id', serviceCase.id).maybeSingle();
  let pdfUrl: string | null = null;
  if (serviceCase.pdf_storage_path) { const signed = await db.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'danh-gia-dich-vu-cong-files').createSignedUrl(serviceCase.pdf_storage_path, 15 * 60); pdfUrl = signed.data?.signedUrl || null; }
  return NextResponse.json({ data: { ...serviceCase, pdf_storage_path: undefined, pdfUrl, alreadyRated: Boolean(rating) } });
}
