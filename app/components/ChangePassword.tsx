'use client';

import { FormEvent, useState } from 'react';

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    const response = await fetch('/api/public-service/auth/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) setError(body.error?.message || 'Không thể đổi mật khẩu.');
    else { setMessage('Đã đổi mật khẩu thành công.'); setForm({ currentPassword: '', newPassword: '' }); setTimeout(() => { setOpen(false); setMessage(''); }, 1200); }
    setBusy(false);
  };

  return <>
    <button className="change-trigger" onClick={() => { setOpen(true); setError(''); setMessage(''); }}>Đổi mật khẩu</button>
    {open && <div className="password-backdrop" role="dialog" aria-modal="true"><form className="password-modal" onSubmit={submit}><button type="button" className="close" onClick={() => setOpen(false)}>×</button><p className="kicker">BẢO MẬT TÀI KHOẢN</p><h2>Đổi mật khẩu</h2><p className="intro">Hãy chọn mật khẩu mới dễ nhớ với bạn nhưng khó đoán với người khác.</p><label>Mật khẩu hiện tại<input required type="password" value={form.currentPassword} onChange={event => setForm({ ...form, currentPassword: event.target.value })} autoComplete="current-password" /></label><label>Mật khẩu mới<input required minLength={8} type="password" value={form.newPassword} onChange={event => setForm({ ...form, newPassword: event.target.value })} autoComplete="new-password" /></label>{error && <p className="feedback error">{error}</p>}{message && <p className="feedback success">{message}</p>}<button className="submit" disabled={busy}>{busy ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button></form><style jsx>{`.change-trigger{border:0;background:#eef1f7;color:#52617b;border-radius:8px;padding:9px 12px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.password-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:rgba(15,25,42,.48)}.password-modal{position:relative;width:min(100%,390px);background:#fff;border-radius:16px;padding:25px;box-shadow:0 24px 80px rgba(15,23,42,.25)}.close{position:absolute;right:14px;top:10px;border:0;background:none;color:#8290a5;font-size:23px;cursor:pointer}.kicker{margin:0 0 10px;color:#6277bf;font-size:9px;letter-spacing:.18em;font-weight:900}.password-modal h2{margin:0;font-size:25px;letter-spacing:-.04em}.intro{color:#8792a5;font-size:12px;line-height:1.5}.password-modal label{display:grid;gap:7px;margin-top:14px;color:#61708a;font-size:11px;font-weight:800}.password-modal input{border:1px solid #dfe4ec;border-radius:8px;padding:11px;font:inherit;outline:none}.password-modal input:focus{border-color:#7285d0;box-shadow:0 0 0 3px rgba(114,133,208,.12)}.feedback{border-radius:8px;padding:10px;font-size:11px}.feedback.error{background:#fff0ef;color:#b14e4a}.feedback.success{background:#e5f7ed;color:#2e8a5b}.submit{width:100%;border:0;border-radius:8px;background:#273755;color:#fff;padding:12px;font:inherit;font-size:11px;font-weight:850;cursor:pointer;margin-top:17px}.submit:disabled{opacity:.6}`}</style></div>}
  </>;
}
