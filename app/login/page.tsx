'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/public-service/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: login, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message || 'Email hoặc mật khẩu không đúng.');
        return;
      }
      window.location.assign(body.data?.role === 'admin' ? '/' : '/cases');
    } catch {
      setError('Không thể kết nối hệ thống. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="Giới thiệu hệ thống">
        <div className="visual-top"><span className="seal">ĐG</span><span className="visual-label">NỀN TẢNG VẬN HÀNH</span></div>
        <div className="visual-copy">
          <p className="eyebrow">ĐÁNH GIÁ DỊCH VỤ CÔNG</p>
          <h1>Kết nối đúng người.<br /><em>Lắng nghe đúng lúc.</em></h1>
          <p>Quản lý hồ sơ hành chính, gửi thông báo qua Zalo OA và tiếp nhận phản hồi của công dân trong một quy trình thống nhất.</p>
        </div>
        <div className="visual-footer"><span>01</span><div><b>Minh bạch trong từng hồ sơ</b><small>Vận hành an toàn · Phân quyền rõ ràng</small></div></div>
        <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
      </section>
      <section className="login-panel">
        <div className="mobile-brand"><span className="seal small">ĐG</span><b>Đánh giá Dịch vụ Công</b></div>
        <div className="form-wrap">
          <p className="eyebrow dark">CỔNG NỘI BỘ</p>
          <h2>Chào mừng trở lại</h2>
          <p className="intro">Đăng nhập bằng tài khoản được cấp để tiếp tục công việc.</p>
          <form onSubmit={signIn}>
            <label>Tài khoản
              <span className="input-wrap"><span className="input-icon">@</span><input type="text" value={login} onChange={event => setLogin(event.target.value)} autoComplete="username" placeholder="Email hoặc username" required /></span>
            </label>
            <label>Mật khẩu
              <span className="input-wrap"><span className="input-icon">⌁</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" required /><button type="button" className="show-password" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></span>
            </label>
            {error && <div className="error" role="alert"><span>!</span>{error}</div>}
            <button className="submit" type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Đang xác thực…</> : <>Đăng nhập <span>→</span></>}</button>
          </form>
          <p className="support">Cần hỗ trợ tài khoản? Liên hệ quản trị viên của đơn vị.</p>
        </div>
        <footer>© 2026 · Hệ thống Đánh giá Dịch vụ Công</footer>
      </section>
      <style jsx>{`
        *{box-sizing:border-box}.login-shell{min-height:100vh;display:grid;grid-template-columns:minmax(380px,45%) 1fr;background:#f6f7fa;color:#1d2940;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.login-visual{position:relative;overflow:hidden;background:#182640;color:#fff;padding:44px clamp(32px,6vw,88px);display:flex;flex-direction:column;justify-content:space-between}.visual-top{display:flex;align-items:center;gap:13px;position:relative;z-index:1}.seal{width:44px;height:44px;display:grid;place-items:center;background:#d6f47f;color:#182640;border-radius:14px;font-weight:950;letter-spacing:-.08em}.visual-label{font-size:10px;letter-spacing:.18em;color:#aab7cc;font-weight:800}.visual-copy{position:relative;z-index:1;margin:auto 0}.eyebrow{font-size:10px;letter-spacing:.19em;font-weight:900;color:#d6f47f;margin:0 0 17px}.eyebrow.dark{color:#6174bb;margin-bottom:13px}.visual-copy h1{font-size:clamp(38px,4.7vw,68px);line-height:1.02;letter-spacing:-.065em;margin:0 0 24px}.visual-copy h1 em{font-style:normal;color:#d6f47f}.visual-copy>p:last-child{max-width:440px;color:#b4c0d2;font-size:14px;line-height:1.75;margin:0}.visual-footer{display:flex;gap:14px;align-items:center;position:relative;z-index:1}.visual-footer>span{font-size:12px;color:#d6f47f;font-weight:900}.visual-footer b,.visual-footer small{display:block}.visual-footer b{font-size:12px}.visual-footer small{font-size:11px;color:#8998b1;margin-top:4px}.visual-orbit{position:absolute;border:1px solid rgba(214,244,127,.17);border-radius:50%;pointer-events:none}.orbit-one{width:550px;height:550px;right:-270px;top:18%;}.orbit-two{width:340px;height:340px;right:-165px;top:31%;}.login-panel{display:flex;flex-direction:column;padding:34px clamp(28px,7vw,110px) 25px;background:#fbfcfe}.mobile-brand{display:none}.form-wrap{width:min(100%,430px);margin:auto}.form-wrap h2{font-size:37px;letter-spacing:-.055em;margin:0 0 10px}.intro{color:#7f8ca2;font-size:14px;line-height:1.6;margin:0 0 31px}.form-wrap form{display:grid;gap:19px}.form-wrap label{display:grid;gap:8px;font-size:12px;color:#43506a;font-weight:800}.input-wrap{display:flex;align-items:center;border:1px solid #dfe4ec;background:#fff;border-radius:11px;transition:.2s}.input-wrap:focus-within{border-color:#7185d2;box-shadow:0 0 0 4px rgba(113,133,210,.12)}.input-icon{width:42px;text-align:center;color:#8995ab;font-size:17px}.input-wrap input{min-width:0;flex:1;border:0;outline:0;background:transparent;padding:14px 4px 14px 0;color:#1e2a42;font:inherit;font-size:14px}.input-wrap input::placeholder{color:#adb6c6}.show-password{border:0;background:transparent;color:#6274bd;font-size:11px;font-weight:800;padding:8px 13px;cursor:pointer}.error{display:flex;align-items:center;gap:9px;background:#fff0ef;border:1px solid #ffd8d4;color:#b14e4a;border-radius:9px;padding:11px 13px;font-size:12px;line-height:1.4}.error span{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#c96a64;color:#fff;font-weight:900}.submit{border:0;border-radius:11px;background:#243556;color:#fff;padding:14px 17px;font-weight:850;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:.2s}.submit:hover{background:#314a78;transform:translateY(-1px)}.submit:disabled{opacity:.65;cursor:wait;transform:none}.submit>span{font-size:20px;line-height:10px}.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;margin-right:auto}@keyframes spin{to{transform:rotate(360deg)}}.support{text-align:center;color:#9aa5b7;font-size:11px;margin:25px 0 0}.login-panel footer{text-align:center;color:#a4adbc;font-size:10px}.small{width:34px;height:34px;border-radius:10px;font-size:11px}@media(max-width:800px){.login-shell{display:block}.login-visual{min-height:280px;padding:24px 22px}.visual-copy{margin:38px 0 10px}.visual-copy h1{font-size:38px;margin-bottom:13px}.visual-copy>p:last-child{font-size:12px;line-height:1.5;max-width:390px}.visual-footer{display:none}.orbit-one{width:330px;height:330px;right:-190px;top:14%}.orbit-two{width:220px;height:220px;right:-130px;top:27%}.login-panel{min-height:calc(100vh - 280px);padding:25px 22px 20px}.mobile-brand{display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:18px}.mobile-brand b{font-size:13px}.form-wrap{margin:0 auto;width:min(100%,430px)}.form-wrap h2{font-size:30px}}
      `}</style>
    </main>
  );
}
