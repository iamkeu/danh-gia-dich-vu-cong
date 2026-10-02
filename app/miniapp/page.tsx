'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type CaseData = {
  case_code: string;
  procedure_name: string;
  department_name: string;
  officer_name: string;
  appointment_date?: string | null;
  pdfUrl?: string | null;
  alreadyRated?: boolean;
};

type SdkIdentity = { oaUid: string; appUid?: string; followedOA?: boolean };

type MiniAppBridge = {
  getUserID?: () => Promise<string>;
  getUserInfo?: (options?: { autoRequestPermission?: boolean }) => Promise<any>;
};

const getBridge = (): MiniAppBridge | null => {
  if (typeof window === 'undefined') return null;
  const root = window as any;
  return root.zmp || root.ZaloMiniApp || root.zaloMiniApp || null;
};

async function readZaloIdentity(): Promise<SdkIdentity | null> {
  const sdk = getBridge();
  if (!sdk) return null;

  try {
    if (sdk.getUserInfo) {
      const response = await sdk.getUserInfo({ autoRequestPermission: false });
      const info = response?.userInfo || response;
      if (info?.idByOA) {
        return { oaUid: String(info.idByOA), appUid: info.id ? String(info.id) : undefined, followedOA: info.followedOA };
      }
      if (info?.id && sdk.getUserID) {
        const appUid = await sdk.getUserID();
        return { oaUid: '', appUid: String(appUid || info.id), followedOA: info.followedOA };
      }
    }
    if (sdk.getUserID) {
      const appUid = await sdk.getUserID();
      return { oaUid: '', appUid: String(appUid || '') };
    }
  } catch {
    return null;
  }
  return null;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

export default function MiniAppPage() {
  const [token, setToken] = useState('');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [oaUid, setOaUid] = useState('');
  const [appUid, setAppUid] = useState('');
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const tokenMissing = useMemo(() => !token, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    setTestMode(params.get('test') === '1');
    setSdkAvailable(Boolean(getBridge()));

    readZaloIdentity().then((identity) => {
      if (!identity) return;
      setOaUid(identity.oaUid);
      setAppUid(identity.appUid || '');
      if (!identity.oaUid && !params.get('test')) {
        setNotice('Mini App đã nhận diện tài khoản nhưng chưa có idByOA. Hãy xác thực Mini App với OA và bảo đảm tài khoản đang quan tâm OA.');
      }
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setBusy(false);
      setError('Liên kết hồ sơ không hợp lệ hoặc đã bị thiếu token.');
      return;
    }

    fetch(`/api/public-service/cases/by-token/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || 'Không thể tải giấy hẹn.');
        setCaseData(payload.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải giấy hẹn.'))
      .finally(() => setBusy(false));
  }, [token]);

  const submitRating = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!oaUid) {
      setError(testMode ? 'Nhập OA UID test trước khi gửi.' : 'Chưa nhận được idByOA từ Zalo. Vui lòng xác thực Mini App với OA.');
      return;
    }
    if (!stars) {
      setError('Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }
    if (comment.trim() && !consent) {
      setError('Vui lòng đồng ý cho phép sử dụng góp ý trước khi gửi.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/public-service/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, oaUid, stars, comment: comment.trim(), commentConsent: consent }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Không thể ghi nhận đánh giá.');
      setSubmitted(true);
      setNotice('Đánh giá của Anh/Chị đã được ghi nhận. Cảm ơn Anh/Chị đã phản hồi.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể ghi nhận đánh giá.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="citizen-app">
      <div className="shell">
        <header className="brand-header">
          <div className="brand-mark">ĐG</div>
          <div>
            <p className="kicker">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</p>
            <h1>Giấy hẹn & phản hồi dịch vụ</h1>
          </div>
        </header>

        {busy && <div className="alert info">Đang tải thông tin hồ sơ…</div>}
        {notice && <div className="alert success">✓ {notice}</div>}
        {error && <div className="alert danger">! {error}</div>}
        {tokenMissing && <div className="empty-state"><strong>Chưa có liên kết hồ sơ</strong><span>Hãy mở Mini App từ nút trong tin nhắn Zalo OA.</span></div>}

        {caseData && (
          <>
            <section className="card appointment-card">
              <div className="card-label">GIẤY HẸN TRẢ KẾT QUẢ</div>
              <div className="case-heading"><div><h2>{caseData.case_code}</h2><p>{caseData.procedure_name}</p></div><span className="status-chip">Đã phát hành</span></div>
              <dl className="details">
                <div><dt>Đơn vị tiếp nhận</dt><dd>{caseData.department_name || 'Chưa cập nhật'}</dd></div>
                <div><dt>Cán bộ phụ trách</dt><dd>{caseData.officer_name || 'Chưa cập nhật'}</dd></div>
                <div><dt>Ngày hẹn trả</dt><dd>{formatDate(caseData.appointment_date)}</dd></div>
              </dl>
              {caseData.pdfUrl && <a className="pdf-button" href={caseData.pdfUrl} target="_blank" rel="noreferrer"><span>▣</span> Mở giấy hẹn PDF <b>↗</b></a>}
            </section>

            {submitted || caseData.alreadyRated ? (
              <section className="card completed-card"><div className="completed-icon">✓</div><h2>Đã ghi nhận phản hồi</h2><p>Ý kiến của Anh/Chị giúp đơn vị cải thiện chất lượng phục vụ.</p></section>
            ) : (
              <form className="card rating-card" onSubmit={submitRating}>
                <div className="card-label">PHẢN HỒI CỦA CÔNG DÂN</div>
                <h2>Trải nghiệm của Anh/Chị thế nào?</h2>
                <p className="helper">Chọn số sao phù hợp nhất với trải nghiệm vừa qua.</p>
                <div className="stars" role="radiogroup" aria-label="Mức độ hài lòng">
                  {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={stars === value} aria-label={`${value} sao`} className={value <= stars ? 'star active' : 'star'} onClick={() => setStars(value)}>★</button>)}
                </div>
                <div className="rating-caption">{stars ? `${stars}/5 sao` : 'Chưa chọn mức đánh giá'}</div>
                <label className="field-label" htmlFor="comment">Góp ý thêm <span>Không bắt buộc</span></label>
                <textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Chia sẻ ngắn gọn để chúng tôi phục vụ tốt hơn…" rows={4} />
                <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi đồng ý cho phép đơn vị sử dụng góp ý này để cải thiện chất lượng phục vụ.</span></label>
                {testMode && <div className="test-field"><label className="field-label" htmlFor="oaUid">OA UID test</label><input id="oaUid" value={oaUid} onChange={(event) => setOaUid(event.target.value)} placeholder="Chỉ dùng khi test=1" /></div>}
                {!testMode && <p className={oaUid ? 'identity ready' : 'identity pending'}>{oaUid ? '✓ Đã nhận diện theo Official Account' : sdkAvailable ? 'Đang chờ idByOA từ Zalo…' : 'Mở trong Zalo để Mini App nhận diện tài khoản'}</p>}
                <button className="submit-button" type="submit" disabled={busy || !stars || (!oaUid && !testMode)}>{busy ? 'Đang xử lý…' : 'Gửi đánh giá'}</button>
                <p className="privacy">Thông tin định danh chỉ được dùng để xác định đúng hồ sơ và chống gửi trùng.</p>
              </form>
            )}
          </>
        )}
      </div>
      <style jsx>{`*{box-sizing:border-box}.citizen-app{min-height:100vh;background:#f4f7fb;color:#17243d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;padding:20px 14px 44px}.shell{width:min(560px,100%);margin:0 auto}.brand-header{display:flex;align-items:center;gap:12px;padding:8px 3px 20px}.brand-mark{width:42px;height:42px;border-radius:13px;background:#213655;color:#d2f477;display:grid;place-items:center;font-weight:900;letter-spacing:-.08em}.kicker,.card-label{font-size:9px;letter-spacing:.15em;font-weight:850;color:#7c8aa1;margin:0 0 5px}.brand-header h1{font-size:19px;letter-spacing:-.04em;margin:0}.alert{border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.5;margin-bottom:12px}.info{background:#e7f1ff;color:#265a9c}.success{background:#e3f7ec;color:#23784d}.danger{background:#ffebea;color:#a84343}.card{background:#fff;border:1px solid #e4eaf2;border-radius:18px;padding:21px;box-shadow:0 8px 26px rgba(24,45,76,.05);margin-top:12px}.appointment-card{border-top:4px solid #c8ed6a}.case-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.case-heading h2{font-size:25px;letter-spacing:-.05em;margin:3px 0 5px}.case-heading p{font-size:13px;font-weight:700;color:#43536d;margin:0;line-height:1.4}.status-chip{font-size:10px;font-weight:800;border-radius:99px;background:#e5f7ec;color:#2b8b5b;padding:6px 9px;white-space:nowrap}.details{display:grid;gap:12px;border-top:1px solid #edf0f5;margin:19px 0 0;padding-top:16px}.details dt{font-size:11px;color:#8390a4}.details dd{font-size:13px;font-weight:750;margin:3px 0 0}.pdf-button{display:flex;align-items:center;gap:9px;margin-top:19px;padding:12px 13px;border-radius:10px;background:#eaf1ff;color:#2d5db2;text-decoration:none;font-size:12px;font-weight:800}.pdf-button b{margin-left:auto;font-size:18px}.rating-card h2{font-size:21px;letter-spacing:-.04em;margin:8px 0 5px}.helper{font-size:12px;line-height:1.5;color:#7d8aa0;margin:0}.stars{display:flex;justify-content:center;gap:7px;margin:18px 0 4px}.star{border:0;background:none;color:#d3dbe7;font-size:41px;line-height:1;padding:0 2px;cursor:pointer;transition:transform .15s,color .15s}.star:hover,.star.active{color:#f1ac28;transform:translateY(-2px)}.rating-caption{text-align:center;color:#7c8aa0;font-size:11px;min-height:18px}.field-label{display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin:18px 0 7px}.field-label span{font-size:10px;color:#97a1b1;font-weight:500}.rating-card textarea,.test-field input{width:100%;border:1px solid #d9e0ea;border-radius:10px;padding:12px;font:inherit;font-size:13px;resize:vertical;outline:none}.rating-card textarea:focus,.test-field input:focus{border-color:#5377c8;box-shadow:0 0 0 3px rgba(83,119,200,.12)}.consent{display:flex;gap:9px;align-items:flex-start;margin-top:14px;color:#58667c;font-size:12px;line-height:1.45}.consent input{margin-top:2px;accent-color:#2f61c6}.test-field{margin-top:8px;padding-top:4px;border-top:1px dashed #dfe5ed}.test-field .field-label{margin-top:12px}.identity{font-size:11px;margin:14px 0 0}.identity.ready{color:#2d8a5b}.identity.pending{color:#a47722}.submit-button{width:100%;border:0;border-radius:11px;background:#2d61c7;color:#fff;padding:13px;margin-top:18px;font-weight:850;cursor:pointer}.submit-button:disabled{opacity:.5;cursor:not-allowed}.privacy{text-align:center;color:#9aa5b5;font-size:10px;line-height:1.45;margin:12px 12px 0}.completed-card{text-align:center;padding:32px 21px}.completed-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#dff5e9;color:#2c9361;font-size:27px;font-weight:900;margin:0 auto 14px}.completed-card h2{font-size:20px;margin:0 0 7px}.completed-card p{font-size:12px;color:#7b879b;margin:0;line-height:1.5}.empty-state{text-align:center;background:#fff;border:1px dashed #d9e1ec;border-radius:16px;padding:30px 20px;color:#7c899d;font-size:13px}.empty-state strong,.empty-state span{display:block}.empty-state strong{color:#34425b;margin-bottom:7px}@media(max-width:420px){.citizen-app{padding-left:10px;padding-right:10px}.card{padding:17px}.star{font-size:36px}.case-heading{display:block}.status-chip{display:inline-block;margin-top:10px}}`}</style>
    </main>
  );
}
