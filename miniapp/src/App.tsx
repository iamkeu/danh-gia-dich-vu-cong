import { FormEvent, useEffect, useState } from 'react';
import { confirmCaseReceipt, getCaseByToken, CaseData, submitRating } from './services/publicServiceApi';
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
    const queryToken = new URLSearchParams(window.location.search).get('token') || '';
    setToken(queryToken);
    if (!queryToken) {
      setIsError(true);
      setMessage('Liên kết hồ sơ không hợp lệ. Hãy quét QR hoặc mở Mini App từ tin nhắn Zalo OA.');
      setLoading(false);
      return;
    }
    Promise.all([getCaseByToken(queryToken), readCitizenIdentity()])
      .then(([data, citizen]) => { setCaseData(data); setIdentity(citizen); })
      .catch((error: unknown) => { setIsError(true); setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ.'); })
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

  async function handleConfirm() {
    if (!identity?.oaUid) return;
    setWorking(true); setIsError(false); setMessage('');
    try {
      await confirmCaseReceipt(token, identity.oaUid);
      setCaseData((previous) => previous ? { ...previous, isConfirmed: true } : previous);
      setMessage('Đã xác nhận nhận kết quả hồ sơ qua Zalo.');
    } catch (error: unknown) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Không thể xác nhận hồ sơ.');
    } finally { setWorking(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsError(false); setMessage('');
    if (!stars) return showError('Vui lòng chọn số sao từ 1 đến 5.');
    if (comment.trim() && !consent) return showError('Vui lòng đồng ý cho phép sử dụng góp ý trước khi gửi.');
    if (!identity?.oaUid) return showError('Chưa xác định được tài khoản theo OA.');
    if (!caseData?.isConfirmed) return showError('Vui lòng xác nhận nhận kết quả hồ sơ trước khi đánh giá.');
    setWorking(true);
    try {
      await submitRating({ token, oaUid: identity.oaUid, stars, comment: comment.trim(), commentConsent: consent });
      setSubmitted(true); setMessage('Ý kiến của Anh/Chị đã được ghi nhận. Cảm ơn Anh/Chị đã phản hồi.');
    } catch (error: unknown) { showError(error instanceof Error ? error.message : 'Không thể ghi nhận đánh giá.'); }
    finally { setWorking(false); }
  }

  function showError(text: string) { setIsError(true); setMessage(text); }

  if (loading && !caseData) return <main className="page"><div className="card center">Đang tải thông tin hồ sơ…</div></main>;
  if (!caseData) return <main className="page"><div className="card center error">{message || 'Không có dữ liệu hồ sơ.'}</div></main>;

  const needsFollow = !identity?.oaUid;
  const needsConfirmation = Boolean(identity?.oaUid && !caseData.isConfirmed);

  return <main className="page"><div className="container">
    <header className="brand"><div className="logo">ĐG</div><div><div className="eyebrow">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</div><h1>Giấy hẹn & phản hồi dịch vụ</h1></div></header>
    {message && <div className={`notice ${isError ? 'notice-error' : 'notice-success'}`}>{message}</div>}

    <section className="card appointment">
      <div className="eyebrow">GIẤY HẸN TRẢ KẾT QUẢ</div>
      <div className="case-title"><div><h2>{caseData.case_code}</h2><p>{caseData.procedure_name}</p></div><span className="badge">Đã phát hành</span></div>
      <dl className="details"><div><dt>Đơn vị tiếp nhận</dt><dd>{caseData.department_name || 'Chưa cập nhật'}</dd></div><div><dt>Cán bộ phụ trách</dt><dd>{caseData.officer_name || 'Chưa cập nhật'}</dd></div><div><dt>Ngày hẹn trả</dt><dd>{formatDate(caseData.appointment_date)}</dd></div></dl>
      {caseData.pdfUrl && <a className="pdf-link" href={caseData.pdfUrl} target="_blank" rel="noreferrer">▣ &nbsp; Mở giấy hẹn PDF <b>↗</b></a>}
    </section>

    {needsFollow && <section className="card action-card"><div className="step">BƯỚC 1</div><h2>Quan tâm OA để nhận thông báo</h2><p className="muted">Để nhận giấy hẹn và thông báo kết quả hồ sơ qua Zalo, Anh/Chị vui lòng quan tâm Official Account của đơn vị.</p><button className="submit" disabled={working} onClick={handleFollow}>{working ? 'Đang mở xác nhận…' : 'Quan tâm OA để nhận thông báo'}</button></section>}

    {needsConfirmation && <section className="card action-card"><div className="step">BƯỚC 2</div><h2>Xác nhận nhận kết quả hồ sơ</h2><p className="muted">Tài khoản Zalo hiện tại sẽ được liên kết với hồ sơ này để nhận giấy hẹn và thông báo sau này.</p><button className="submit" disabled={working} onClick={handleConfirm}>{working ? 'Đang xác nhận…' : 'Xác nhận nhận kết quả hồ sơ'}</button></section>}

    {caseData.isConfirmed && <section className="card confirmation"><div className="check">✓</div><div><b>Đã xác nhận nhận kết quả hồ sơ</b><p className="muted">Cán bộ có thể gửi thông báo qua Zalo OA đến tài khoản này.</p></div></section>}

    {submitted || caseData.alreadyRated ? <section className="card complete center"><div className="check">✓</div><h2>Đã ghi nhận phản hồi</h2><p>Cảm ơn Anh/Chị đã góp phần cải thiện chất lượng phục vụ.</p></section> : <form className={`card ${!caseData.isConfirmed ? 'disabled-card' : ''}`} onSubmit={handleSubmit}><div className="eyebrow">PHẢN HỒI CỦA CÔNG DÂN</div><h2>Trải nghiệm của Anh/Chị thế nào?</h2><p className="muted">Sau khi xác nhận nhận kết quả, Anh/Chị có thể đánh giá trải nghiệm vừa qua.</p><div className="stars" role="radiogroup" aria-label="Mức độ hài lòng">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={value <= stars ? 'star active' : 'star'} aria-label={`${value} sao`} onClick={() => setStars(value)} disabled={!caseData.isConfirmed}>★</button>)}</div><div className="star-label">{stars ? `${stars}/5 sao` : 'Chưa chọn mức đánh giá'}</div><label className="field-label" htmlFor="comment">Góp ý thêm <span>Không bắt buộc</span></label><textarea id="comment" rows={4} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Chia sẻ ngắn gọn để chúng tôi phục vụ tốt hơn…" disabled={!caseData.isConfirmed} /><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={!caseData.isConfirmed} /><span>Tôi đồng ý cho phép đơn vị sử dụng góp ý này để cải thiện chất lượng phục vụ.</span></label><button className="submit" type="submit" disabled={working || !caseData.isConfirmed || !stars}>{working ? 'Đang xử lý…' : 'Gửi đánh giá'}</button><p className="privacy">Thông tin định danh chỉ được dùng để xác định đúng hồ sơ và chống gửi trùng.</p></form>}
  </div></main>;
}
