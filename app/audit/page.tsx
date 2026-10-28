'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkspaceShell from '@/app/components/WorkspaceShell';

type Account = { display_name: string; email: string; role: string };
type Log = { id: string; case_id?: string | null; action: string; metadata?: Record<string, unknown>; created_at: string; case?: { case_code: string; procedure_name: string } | null; actor?: { display_name: string; email: string; role: string } | null };

const actionLabels: Record<string, string> = {
  'case.created': 'Tạo hồ sơ',
  'case.pdf_uploaded': 'Tải PDF giấy hẹn',
  'case.qr_regenerated': 'Sinh lại mã QR',
  'case.oa_linked': 'Liên kết OA',
  'case.citizen_confirmed_and_rated': 'Công dân đã xác nhận và đánh giá',
  'case.oa_auto_send_after_rating': 'Tự động gửi OA sau đánh giá',
  'case.notifications.processed': 'Xử lý gửi OA',
  'case.deleted': 'Xóa hồ sơ',
  'rating.submitted': 'Ghi nhận đánh giá',
  'rating.webhook.received': 'Nhận webhook đánh giá',
  'admin_account.created': 'Tạo tài khoản',
  'admin_account.updated': 'Cập nhật tài khoản',
  'admin_account.deleted': 'Xóa tài khoản',
};

function detail(log: Log) {
  const metadata = log.metadata || {};
  const status = typeof metadata.status === 'string' ? metadata.status : '';
  const stars = typeof metadata.stars === 'number' ? ` · ${metadata.stars} sao` : '';
  const parts = Array.isArray(metadata.sentParts) && metadata.sentParts.length ? ` · Đã gửi: ${metadata.sentParts.join(', ')}` : '';
  const failed = Array.isArray(metadata.failedParts) && metadata.failedParts.length ? ` · Lỗi: ${metadata.failedParts.length} phần` : '';
  return `${status ? `Trạng thái: ${status}` : ''}${stars}${parts}${failed}`.replace(/^ · /, '');
}

export default function AuditPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([fetch('/api/me', { cache: 'no-store' }), fetch('/api/public-service/audit-logs', { cache: 'no-store' })]).then(async ([me, response]) => { if (!me.ok) { location.assign('/login'); return; } const current = (await me.json()).data; setAccount(current); if (response.ok) setLogs((await response.json()).data || []); else setError('Không tải được Nhật ký.'); }); }, []);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return term ? logs.filter(log => [log.case?.case_code, log.case?.procedure_name, actionLabels[log.action], log.actor?.display_name, log.actor?.email].some(value => String(value || '').toLowerCase().includes(term))) : logs; }, [logs, query]);
  if (!account) return <div className="loading">Đang tải Nhật ký…<style jsx>{`.loading{min-height:100vh;display:grid;place-items:center;background:#f5f7fb;color:#78869e;font:13px Inter,system-ui}`}</style></div>;
  return <WorkspaceShell account={account} active="audit" title="Nhật ký" subtitle="Theo dõi các hoạt động hồ sơ, xác nhận công dân, đánh giá và gửi OA.">
    {error && <div className="alert">! {error}</div>}
    <section className="panel"><div className="head"><div><p className="eyebrow">AUDIT LOG</p><h2>Lịch sử hoạt động</h2><span>{filtered.length} hoạt động hiển thị</span></div><input aria-label="Tìm nhật ký" placeholder="Tìm mã hồ sơ, hoạt động hoặc tài khoản" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="log-list">{filtered.length === 0 ? <div className="empty">Chưa có hoạt động phù hợp.</div> : filtered.map(log => <article className="log-row" key={log.id}><span className="dot">•</span><div className="log-main"><b>{actionLabels[log.action] || log.action}</b><strong>{log.case?.case_code || 'Hệ thống'}</strong><small>{log.case?.procedure_name || (log.actor ? `${log.actor.display_name || log.actor.email} · ${log.actor.role}` : 'Công dân / hệ thống')} {detail(log) && ` · ${detail(log)}`}</small></div><time>{new Date(log.created_at).toLocaleString('vi-VN')}</time></article>)}</div></section>
    <style jsx>{`*{box-sizing:border-box}.panel{background:#fff;border:1px solid #e7ebf2;border-radius:15px;padding:21px}.head{display:flex;align-items:end;justify-content:space-between;gap:20px}.eyebrow{font-size:9px;letter-spacing:.18em;color:#7d8aa1;font-weight:900;margin:0 0 8px}.head h2{font-size:21px;letter-spacing:-.04em;margin:0}.head span{display:block;color:#8995a8;font-size:10px;margin-top:6px}.head input{width:min(100%,340px);border:1px solid #dce2eb;border-radius:9px;padding:11px 12px;font:inherit;font-size:11px;outline:0}.head input:focus{border-color:#7387d4;box-shadow:0 0 0 3px rgba(115,135,212,.11)}.log-list{margin-top:17px}.log-row{display:flex;align-items:flex-start;gap:12px;border-top:1px solid #edf0f4;padding:14px 3px}.dot{width:24px;height:24px;display:grid;place-items:center;border-radius:8px;background:#e5ebff;color:#5d72cb;font-size:19px;line-height:1}.log-main{flex:1;min-width:0}.log-main b,.log-main strong,.log-main small{display:block}.log-main b{font-size:12px}.log-main strong{color:#5d72c8;font-size:11px;margin-top:4px}.log-main small{color:#8793a7;font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.log-row time{color:#99a4b4;font-size:10px;white-space:nowrap}.alert{background:#fff0ef;color:#b14e4a;border-radius:9px;padding:11px 13px;margin-bottom:15px;font-size:12px}.empty{padding:30px 0;color:#8995a8}@media(max-width:600px){.head{display:block}.head input{width:100%;margin-top:15px}.log-row time{font-size:9px}.log-main small{white-space:normal;line-height:1.4}}`}</style>
  </WorkspaceShell>;
}
