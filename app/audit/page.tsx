'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkspaceShell from '@/app/components/WorkspaceShell';

type Account = { display_name: string; email: string; role: string };
type Log = { id: string; case_id?: string | null; action: string; metadata?: Record<string, unknown>; created_at: string; case?: { case_code: string; procedure_name: string } | null; actor?: { display_name: string; email: string; role: string } | null };
type LogGroup = { key: string; caseCode: string; procedure: string; logs: Log[]; latest: string };

const actionLabels: Record<string, string> = {
  'case.created': 'Tạo hồ sơ', 'case.pdf_uploaded': 'Tải PDF giấy hẹn', 'case.qr_regenerated': 'Sinh lại mã QR', 'case.oa_linked': 'Liên kết OA',
  'case.citizen_confirmed_and_rated': 'Công dân đã xác nhận và đánh giá', 'case.oa_auto_send_after_rating': 'Tự động gửi OA sau đánh giá',
  'case.notifications.processed': 'Xử lý gửi OA', 'case.deleted': 'Xóa hồ sơ', 'rating.submitted': 'Ghi nhận đánh giá', 'rating.webhook.received': 'Nhận webhook đánh giá',
  'admin_account.created': 'Tạo tài khoản', 'admin_account.updated': 'Cập nhật tài khoản', 'admin_account.deleted': 'Xóa tài khoản',
};

function logDetail(log: Log) {
  const metadata = log.metadata || {};
  const details: string[] = [];
  if (typeof metadata.status === 'string') details.push(`Trạng thái: ${metadata.status}`);
  if (typeof metadata.stars === 'number') details.push(`${metadata.stars} sao`);
  if (Array.isArray(metadata.sentParts) && metadata.sentParts.length) details.push(`Đã gửi: ${metadata.sentParts.join(', ')}`);
  if (Array.isArray(metadata.failedParts) && metadata.failedParts.length) details.push(`Lỗi: ${metadata.failedParts.length} phần`);
  return details.join(' · ');
}

export default function AuditPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [me, response] = await Promise.all([fetch('/api/me', { cache: 'no-store' }), fetch('/api/public-service/audit-logs', { cache: 'no-store' })]);
    if (!me.ok) { location.assign('/login'); return; }
    setAccount((await me.json()).data);
    if (response.ok) setLogs((await response.json()).data || []); else setError('Không tải được Nhật ký.');
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo<LogGroup[]>(() => {
    const map = new Map<string, Log[]>();
    logs.forEach(log => { const key = log.case_id || 'system'; map.set(key, [...(map.get(key) || []), log]); });
    return Array.from(map.entries()).map(([key, items]) => {
      const first = items[0];
      return { key, caseCode: first.case?.case_code || 'Hoạt động hệ thống', procedure: first.case?.procedure_name || 'Tài khoản và vận hành chung', logs: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), latest: items[0].created_at };
    }).filter(group => { const term = query.trim().toLowerCase(); return !term || [group.caseCode, group.procedure, ...group.logs.map(log => actionLabels[log.action] || log.action)].some(value => value.toLowerCase().includes(term)); }).sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());
  }, [logs, query]);
  const selected = groups.find(group => group.key === selectedKey) || groups[0];

  const cleanup = async () => {
    if (!from || !to) { setError('Vui lòng chọn ngày bắt đầu và ngày kết thúc.'); return; }
    if (!window.confirm(`Xóa toàn bộ nhật ký từ ${from} đến ${to}?\n\nThao tác này không thể hoàn tác.`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const response = await fetch('/api/public-service/audit-logs', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from, to }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Không thể xóa nhật ký.'); setMessage(`Đã xóa ${body.data.deleted} bản ghi nhật ký.`); setSelectedKey(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa nhật ký.'); } finally { setBusy(false); }
  };

  if (!account) return <div className="loading">Đang tải Nhật ký…<style jsx>{`.loading{min-height:100vh;display:grid;place-items:center;background:#f5f7fb;color:#78869e;font:13px Inter,system-ui}`}</style></div>;
  return <WorkspaceShell account={account} active="audit" title="Nhật ký" subtitle="Theo dõi hoạt động theo từng hồ sơ và lịch sử gửi OA.">
    {message && <div className="alert success">✓ {message}</div>}{error && <div className="alert error">! {error}</div>}
    <section className="panel"><div className="head"><div><p className="eyebrow">AUDIT LOG</p><h2>Nhật ký theo hồ sơ</h2><span>{groups.length} nhóm hồ sơ/hoạt động</span></div><input aria-label="Tìm nhật ký" placeholder="Tìm mã hồ sơ hoặc hoạt động" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="audit-layout"><div className="group-list">{groups.length === 0 ? <div className="empty">Chưa có hoạt động phù hợp.</div> : groups.map(group => <button className={`group ${selected?.key === group.key ? 'selected' : ''}`} key={group.key} onClick={() => setSelectedKey(group.key)}><span className="group-icon">{group.key === 'system' ? '⚙' : 'H2'}</span><span><b>{group.caseCode}</b><small>{group.procedure}</small></span><em>{group.logs.length}</em></button>)}</div><div className="detail"><p className="eyebrow">CHI TIẾT NHÓM</p><h3>{selected?.caseCode || 'Chưa chọn hồ sơ'}</h3>{selected && <><p className="detail-subtitle">{selected.procedure} · {selected.logs.length} hoạt động</p><div className="timeline">{selected.logs.map(log => <article className="log-row" key={log.id}><span className="dot">•</span><div><b>{actionLabels[log.action] || log.action}</b><small>{new Date(log.created_at).toLocaleString('vi-VN')} · {log.actor ? `${log.actor.display_name || log.actor.email} (${log.actor.role})` : 'Công dân / hệ thống'}</small>{logDetail(log) && <p>{logDetail(log)}</p>}</div></article>)}</div></>}</div></div></section>
    {account.role === 'admin' && <section className="panel cleanup"><div><p className="eyebrow">DỌN DẸP DUNG LƯỢNG</p><h3>Xóa Nhật ký theo khoảng thời gian</h3><p>Chỉ xóa bản ghi audit log; không xóa hồ sơ, PDF, đánh giá hoặc dữ liệu OA.</p></div><div className="cleanup-form"><label>Từ ngày<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Đến ngày<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button disabled={busy} onClick={cleanup}>{busy ? 'Đang xóa…' : 'Xóa nhật ký'}</button></div></section>}
    <style jsx>{`*{box-sizing:border-box}.panel{background:#fff;border:1px solid #e7ebf2;border-radius:15px;padding:21px}.head{display:flex;align-items:end;justify-content:space-between;gap:20px}.eyebrow{font-size:9px;letter-spacing:.18em;color:#7d8aa1;font-weight:900;margin:0 0 8px}.head h2{font-size:21px;letter-spacing:-.04em;margin:0}.head span{display:block;color:#8995a8;font-size:10px;margin-top:6px}.head input{width:min(100%,320px);border:1px solid #dce2eb;border-radius:9px;padding:11px 12px;font:inherit;font-size:11px;outline:0}.audit-layout{display:grid;grid-template-columns:330px 1fr;gap:17px;margin-top:18px}.group-list{border-right:1px solid #edf0f4;padding-right:12px;max-height:620px;overflow:auto}.group{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:0;border-bottom:1px solid #edf0f4;background:#fff;padding:12px 8px;border-radius:9px;cursor:pointer;color:#1b2942}.group.selected,.group:hover{background:#f0f4ff}.group-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#eef1f8;color:#5d72c8;font-size:10px;font-weight:900;flex:none}.group>span:nth-child(2){flex:1;min-width:0}.group b,.group small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.group b{font-size:11px}.group small{font-size:10px;color:#8a96a8;margin-top:4px}.group em{font-style:normal;color:#8b97a9;font-size:10px}.detail{min-width:0}.detail h3{font-size:22px;letter-spacing:-.04em;margin:0}.detail-subtitle{color:#8995a8;font-size:11px;margin:6px 0 16px}.timeline{border-top:1px solid #edf0f4}.log-row{display:flex;gap:10px;padding:13px 2px;border-bottom:1px solid #edf0f4}.dot{width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:#e5ebff;color:#5d72cb;font-size:17px;line-height:1;flex:none}.log-row b,.log-row small,.log-row p{display:block}.log-row b{font-size:11px}.log-row small{color:#8a96a8;font-size:9px;margin-top:4px}.log-row p{color:#64738a;font-size:10px;margin:5px 0 0}.cleanup{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:16px}.cleanup h3{font-size:17px;margin:0}.cleanup p:not(.eyebrow){color:#8995a8;font-size:10px;margin:7px 0 0}.cleanup-form{display:flex;align-items:end;gap:8px}.cleanup-form label{display:grid;gap:5px;color:#7e8ba0;font-size:10px;font-weight:800}.cleanup-form input{border:1px solid #dce2eb;border-radius:8px;padding:9px;font:inherit;font-size:11px}.cleanup-form button{border:0;border-radius:8px;background:#b24e4a;color:#fff;padding:10px 12px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.cleanup-form button:disabled{opacity:.5}.alert{border-radius:9px;padding:11px 13px;margin-bottom:14px;font-size:12px}.success{background:#e4f7ed;color:#31875c}.error{background:#fff0ef;color:#b24e4a}.empty{padding:25px;color:#8995a8}@media(max-width:800px){.audit-layout{grid-template-columns:1fr}.group-list{border-right:0;border-bottom:1px solid #edf0f4;padding:0 0 10px;max-height:280px}.cleanup{display:block}.cleanup-form{margin-top:14px;flex-wrap:wrap}.head{display:block}.head input{width:100%;margin-top:15px}}`}</style>
  </WorkspaceShell>;
}
