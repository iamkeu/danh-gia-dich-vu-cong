'use client';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/public-service/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const body = await response.json();
    if (!response.ok) setError(body.error?.message || 'Email hoặc mật khẩu không đúng');
    else window.location.assign('/');
    setBusy(false);
  };

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}><form onSubmit={signIn} style={{ width: 'min(100%, 420px)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 30, boxShadow: '0 16px 40px rgba(15,23,42,.08)' }}><p style={{ color: '#2563eb', fontWeight: 800, letterSpacing: '.12em', fontSize: 12 }}>ĐÁNH GIÁ DỊCH VỤ CÔNG</p><h1 style={{ margin: '8px 0 10px', fontSize: 30, letterSpacing: '-.04em' }}>Đăng nhập quản trị</h1><p style={{ color: '#64748b', lineHeight: 1.55 }}>Dùng tài khoản được quản trị viên cấp để quản lý hồ sơ, kết nối Zalo OA và theo dõi đánh giá.</p><label style={{ display: 'grid', gap: 7, marginTop: 22, fontWeight: 700, fontSize: 14 }}>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 16 }} /></label><label style={{ display: 'grid', gap: 7, marginTop: 14, fontWeight: 700, fontSize: 14 }}>Mật khẩu<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 16 }} /></label><button type="submit" disabled={busy} style={{ width: '100%', marginTop: 22, padding: 13, border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 15, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .65 : 1 }}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>{error && <p role="alert" style={{ color: '#b91c1c', background: '#fee2e2', padding: 12, borderRadius: 10, marginTop: 16 }}>{error}</p>}</form></main>;
}
