import { FormEvent, useEffect, useState } from 'react';
import { getRouteParams } from 'zmp-sdk';
import { confirmAndSubmitFeedback, getCaseByToken, CaseData } from './services/publicServiceApi';
import { readCitizenIdentity, requestFollowOA, CitizenIdentity } from './services/zaloIdentity';

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

export default function App() {
  const [token, setToken] = useState('');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [identity, setIdentity] = useState<CitizenIdentity | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Zalo may keep Mini App entry parameters in its route context rather than
    // exposing them through window.location.search. Keep the URL fallback for
    // browser preview and direct links outside Zalo.
    let routeToken = '';
    try {
      routeToken = String(getRouteParams().token || '');
    } catch {
      routeToken = '';
    }
    const queryToken = routeToken || new URLSearchParams(window.location.search).get('token') || '';
    setToken(queryToken);
    if (!queryToken) {
      setLoading(false);
      return;
    }
    // Loading the case is independent from optional Zalo identity permissions.
    // A permission/SDK failure must not turn a valid QR hồ sơ into “Load failed”.
    getCaseByToken(queryToken)
      .then((data) => {
        setCaseData(data);
        return readCitizenIdentity()
          .then((citizen) => setIdentity(citizen))
          .catch(() => setIdentity(null));
      })
      .catch((error: unknown) => {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleFollow() {
    setWorking(true); setIsError(false); setMessage('');
    try {
      const citizen = await requestFollowOA();
      if (!citizen?.oaUid) throw new Error('Chưa nhận được định danh OA. Vui lòng kiểm tra lại thao tác Quan tâm OA.');
      setIdentity(citizen);
      setMessage('Đã quan tâm OA. Vui lòng bấm “Xác nhận nhận kết quả hồ sơ”.');
    } catch (error: unknown) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Bạn chưa hoàn tất việc quan tâm OA.');
    } finally { setWorking(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsError(false); setMessage('');
    if (!stars) return showError('Vui lòng chọn số sao từ 1 đến 5.');
    if (comment.trim() && !consent) return showError('Vui lòng đồng ý cho phép sử dụng góp ý trước khi gửi.');
    if (!identity?.oaUid) return showError('Chưa xác định được tài khoản theo OA.');
    setWorking(true);
    try {
      await confirmAndSubmitFeedback({ token, oaUid: identity.oaUid, stars, comment: comment.trim(), commentConsent: consent });
      setCaseData((previous) => previous ? { ...previous, isConfirmed: true, alreadyRated: true } : previous);
      setSubmitted(true); setMessage('Đã xác nhận và gửi phản hồi thành công. Cảm ơn Anh/Chị.');
    } catch (error: unknown) { showError(error instanceof Error ? error.message : 'Không thể ghi nhận đánh giá.'); }
    finally { setWorking(false); }
  }

  function showError(text: string) { setIsError(true); setMessage(text); }
  async function openAppointmentPdf() {
    const url = caseData?.pdfUrl;
    if (!url) return showError('Hồ sơ chưa có giấy hẹn PDF.');
    try {
      const sdk = (window as Window & { ZaloMiniAppSDK?: { openDocument?: Function; openWebview?: Function }; zmp?: { openDocument?: Function; openWebview?: Function } }).ZaloMiniAppSDK
        || (window as Window & { zmp?: { openDocument?: Function; openWebview?: Function } }).zmp;
      if (!sdk?.openDocument) throw new Error('PDF_SDK_UNAVAILABLE');
      await sdk.openDocument({ url, title: `Giấy hẹn ${caseData.case_code}`, share: false, download: true, edit: false });
    } catch {
      try {
        const sdk = (window as Window & { ZaloMiniAppSDK?: { openWebview?: Function }; zmp?: { openWebview?: Function } }).ZaloMiniAppSDK
          || (window as Window & { zmp?: { openWebview?: Function } }).zmp;
        if (!sdk?.openWebview) throw new Error('PDF_WEBVIEW_SDK_UNAVAILABLE');
        await sdk.openWebview({ url, config: { style: 'normal', leftButton: 'back' } });
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
        setMessage('Đã yêu cầu mở giấy hẹn. Nếu chưa thấy tài liệu, vui lòng cho phép mở cửa sổ mới hoặc thử lại.');
      }
    }
  }

  if (loading && !caseData) return <main className="page"><div className="card center">Đang tải thông tin hồ sơ…</div></main>;
  if (!token) return <main className="page"><div className="container">
    <header className="brand"><div className="logo">ĐG</div><div><div className="eyebrow">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</div><h1>Đánh giá Dịch vụ Công</h1></div></header>
    <section className="card welcome-card center"><div className="welcome-mark">✓</div><div className="eyebrow">MINI APP ĐÃ SẴN SÀNG</div><h2>Chào mừng Anh/Chị</h2><p className="muted">Mini App hỗ trợ xem giấy hẹn và gửi đánh giá chất lượng phục vụ hành chính công.</p><div className="welcome-steps"><div><b>01</b><span>Nhận mã QR hồ sơ từ cán bộ tại quầy.</span></div><div><b>02</b><span>Quét mã QR để mở đúng giấy hẹn của Anh/Chị.</span></div><div><b>03</b><span>Xác nhận nhận kết quả và gửi đánh giá 1–5 sao.</span></div></div><p className="privacy">Màn hình này được hiển thị khi Mini App được mở từ QR chung hoặc kho Mini App. Dữ liệu hồ sơ chỉ hiển thị khi mở bằng liên kết có mã hồ sơ hợp lệ.</p></section>
  </div></main>;
  if (!caseData) return <main className="page"><div className="card center error">{message || 'Không có dữ liệu hồ sơ.'}</div></main>;

  const needsFollow = !identity?.oaUid;
  return <main className="page"><div className="container">
    <header className="brand"><div className="logo">ĐG</div><div><div className="eyebrow">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</div><h1>Giấy hẹn & phản hồi dịch vụ</h1></div></header>
    {message && <div className={`notice ${isError ? 'notice-error' : 'notice-success'}`}>{message}</div>}

    <section className="card appointment">
      <div className="eyebrow">GIẤY HẸN TRẢ KẾT QUẢ</div>
      <div className="case-title"><div><h2>{caseData.case_code}</h2><p>{caseData.procedure_name}</p></div><span className="badge">Đã phát hành</span></div>
      <dl className="details"><div><dt>Đơn vị tiếp nhận</dt><dd>{caseData.department_name || 'Chưa cập nhật'}</dd></div><div><dt>Cán bộ phụ trách</dt><dd>{caseData.officer_name || 'Chưa cập nhật'}</dd></div><div><dt>Ngày hẹn trả</dt><dd>{formatDate(caseData.appointment_date)}</dd></div></dl>
      {caseData.pdfUrl && <button className="pdf-link" type="button" onClick={openAppointmentPdf}>▣ &nbsp; Mở giấy hẹn PDF <b>↗</b></button>}
    </section>

    {needsFollow && <section className="card action-card"><div className="step">BƯỚC 1</div><h2>Quan tâm OA để nhận thông báo</h2><p className="muted">Để nhận giấy hẹn và thông báo kết quả hồ sơ qua Zalo, Anh/Chị vui lòng quan tâm Official Account của đơn vị.</p><button className="submit" disabled={working} onClick={handleFollow}>{working ? 'Đang mở xác nhận…' : 'Quan tâm OA để nhận thông báo'}</button></section>}

    {submitted || caseData.alreadyRated ? <section className="card complete center"><div className="check">✓</div><h2>Đã ghi nhận phản hồi</h2><p>Cảm ơn Anh/Chị đã góp phần cải thiện chất lượng phục vụ.</p></section> : identity?.oaUid && <form className="card" onSubmit={handleSubmit}><div className="step">BƯỚC 2</div><div className="eyebrow">XÁC NHẬN & PHẢN HỒI</div><h2>Xác nhận và gửi phản hồi</h2><p className="muted">Chọn số sao và nhập góp ý (nếu có). Chỉ cần một lần bấm, hệ thống sẽ đồng thời xác nhận nhận kết quả và ghi nhận đánh giá của Anh/Chị.</p><div className="stars" role="radiogroup" aria-label="Mức độ hài lòng">{[1,2,3,4,5].map((value) => <button key={value} type="button" className="star" aria-label={`${value} sao`} aria-pressed={value <= stars} onClick={() => setStars(value)} style={{ color: value <= stars ? '#f1ac28' : '#d3dbe7' }}>★</button>)}</div><div className="star-label">{stars ? `${stars}/5 sao` : 'Chưa chọn mức đánh giá'}</div><label className="field-label" htmlFor="comment">Góp ý thêm <span>Không bắt buộc</span></label><textarea id="comment" rows={4} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Chia sẻ ngắn gọn để chúng tôi phục vụ tốt hơn…" /><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi đồng ý cho phép đơn vị sử dụng góp ý này để cải thiện chất lượng phục vụ.</span></label><button className="submit" type="submit" disabled={working || !stars}>{working ? 'Đang xác nhận và gửi…' : 'Xác nhận và Gửi phản hồi'}</button><p className="privacy">Thông tin định danh chỉ được dùng để xác định đúng hồ sơ và chống gửi trùng.</p></form>}
  </div></main>;
}
