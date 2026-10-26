export type CaseData = {
  case_code: string;
  procedure_name: string;
  department_name: string;
  officer_name: string;
  appointment_date?: string | null;
  pdfUrl?: string | null;
  alreadyRated?: boolean;
  isConfirmed?: boolean;
  confirmationMethod?: string | null;
};

export type RatingResult = {
  id: string;
  stars: number;
  submitted_at: string;
  message: string;
};

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'https://danh-gia-dich-vu-cong.vercel.app').replace(/\/$/, '');

async function readData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Không thể kết nối máy chủ.');
  return payload.data as T;
}

function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' }).catch(() => {
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
  });
}

export function getCaseByToken(token: string): Promise<CaseData> {
  return request(`${API_BASE}/api/public-service/cases/by-token/${encodeURIComponent(token)}`).then(readData<CaseData>);
}

export function confirmAndSubmitFeedback(input: { token: string; oaUid: string; stars: number; comment: string; commentConsent: boolean }): Promise<{ message: string }> {
  return request(`${API_BASE}/api/public-service/cases/by-token/${encodeURIComponent(input.token)}/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then(readData<{ message: string }>);
}
