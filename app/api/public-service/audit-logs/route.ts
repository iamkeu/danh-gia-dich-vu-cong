import { NextResponse } from 'next/server';
import { publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

export async function GET() {
  try {
    const { account, db } = await requirePublicServiceAccount();
    let logs: any[] = [];

    if (account.role === 'operator') {
      const { data: ownedCases, error: caseError } = await db.from('service_cases').select('id').eq('created_by', account.id).limit(1000);
      if (caseError) throw caseError;
      const caseIds = (ownedCases || []).map(item => item.id);
      const [caseLogs, accountLogs] = await Promise.all([
        caseIds.length ? db.from('service_case_audit_logs').select('id,case_id,actor_account_id,action,metadata,created_at').in('case_id', caseIds).order('created_at', { ascending: false }).limit(300) : Promise.resolve({ data: [], error: null }),
        db.from('service_case_audit_logs').select('id,case_id,actor_account_id,action,metadata,created_at').eq('actor_account_id', account.id).order('created_at', { ascending: false }).limit(100),
      ]);
      if (caseLogs.error) throw caseLogs.error;
      if (accountLogs.error) throw accountLogs.error;
      logs = [...(caseLogs.data || []), ...(accountLogs.data || [])];
    } else {
      const { data, error } = await db.from('service_case_audit_logs').select('id,case_id,actor_account_id,action,metadata,created_at').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      logs = data || [];
    }

    const uniqueLogs = Array.from(new Map(logs.map(log => [log.id, log])).values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 300);
    const caseIds = Array.from(new Set(uniqueLogs.map(log => log.case_id).filter(Boolean)));
    const actorIds = Array.from(new Set(uniqueLogs.map(log => log.actor_account_id).filter(Boolean)));
    const [{ data: cases, error: casesError }, { data: actors, error: actorsError }] = await Promise.all([
      caseIds.length ? db.from('service_cases').select('id,case_code,procedure_name').in('id', caseIds).limit(300) : Promise.resolve({ data: [], error: null }),
      actorIds.length ? db.from('admin_accounts').select('id,display_name,email,role').in('id', actorIds).limit(100) : Promise.resolve({ data: [], error: null }),
    ]);
    if (casesError) throw casesError;
    if (actorsError) throw actorsError;
    const caseMap = new Map((cases || []).map(item => [item.id, item]));
    const actorMap = new Map((actors || []).map(item => [item.id, item]));
    return NextResponse.json({ data: uniqueLogs.map(log => ({ ...log, case: log.case_id ? caseMap.get(log.case_id) || null : null, actor: log.actor_account_id ? actorMap.get(log.actor_account_id) || null : null })) });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}
