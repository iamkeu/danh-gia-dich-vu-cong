import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashOpaqueValue, publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

const createCaseSchema = z.object({
  caseCode: z.string().trim().min(1).max(80),
  procedureName: z.string().trim().min(1).max(240),
  departmentName: z.string().trim().max(160).default(''),
  officerName: z.string().trim().max(160).default(''),
  appointmentDate: z.string().date().nullable().optional(),
  citizenDisplayName: z.string().trim().max(120).nullable().optional(),
  pdfStoragePath: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  try {
    const { account, db } = await requirePublicServiceAccount();
    let query = db.from('service_cases').select('id,case_code,procedure_name,department_name,officer_name,appointment_date,citizen_display_name,status,pdf_storage_path,sent_at,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
    if (account.role === 'operator') query = query.eq('created_by', account.id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { account, db } = await requirePublicServiceAccount(['admin', 'operator']);
    const body = createCaseSchema.parse(await request.json());
    const token = randomBytes(32).toString('base64url');
    const { data: serviceCase, error } = await db.from('service_cases').insert({
      case_code: body.caseCode,
      procedure_name: body.procedureName,
      department_name: body.departmentName,
      officer_name: body.officerName,
      appointment_date: body.appointmentDate ?? null,
      citizen_display_name: body.citizenDisplayName ?? null,
      pdf_storage_path: body.pdfStoragePath ?? null,
      created_by: account.id,
    }).select('id,case_code,procedure_name,department_name,officer_name,appointment_date,citizen_display_name,status,pdf_storage_path,created_at').single();
    if (error || !serviceCase) throw error || new Error('CASE_CREATE_FAILED');
    const { error: tokenError } = await db.from('service_case_tokens').insert({ case_id: serviceCase.id, token_hash: hashOpaqueValue(token), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
    if (tokenError) throw tokenError;
    await db.from('service_case_audit_logs').insert({ case_id: serviceCase.id, actor_account_id: account.id, action: 'case.created', metadata: { caseCode: body.caseCode } });
    return NextResponse.json({ data: { ...serviceCase, token } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Dữ liệu không hợp lệ' } }, { status: 400 });
    return publicServiceAuthError(error);
  }
}
