import { getValidAccessToken } from './token-store';

async function call(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`ZALO_${body.error || response.status}:${body.message || 'API error'}`);
  return body;
}

type OAProfileResponse = { data?: { oa_type?: number | string }; oa_type?: number | string };

export function messageEndpointForOAType(oaType: number): string {
  return oaType === 4
    ? 'https://openapi.zalo.me/v2.0/oa/message'
    : 'https://openapi.zalo.me/v3.0/oa/message/cs';
}

async function getMessageApiVersion(oaId: string): Promise<'v2' | 'v3'> {
  const profile = await getOAProfile(oaId) as OAProfileResponse;
  const rawType = profile.data?.oa_type ?? profile.oa_type;
  const oaType = Number(rawType);
  if (!Number.isFinite(oaType)) throw new Error('OA_TYPE_UNAVAILABLE:Không xác định được loại OA để chọn API gửi tin');
  // Zalo OA cơ quan nhà nước (oa_type=4) chưa hỗ trợ API gửi tin v3.
  return oaType === 4 ? 'v2' : 'v3';
}

async function sendConsultationMessage(oaId: string, body: unknown) {
  const version = await getMessageApiVersion(oaId);
  const endpoint = messageEndpointForOAType(version === 'v2' ? 4 : 2);
  const token = await getValidAccessToken(oaId);
  return call(endpoint, {
    method: 'POST',
    headers: { access_token: token, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getOAProfile(oaId: string) {
  const token = await getValidAccessToken(oaId);
  return call('https://openapi.zalo.me/v2.0/oa/getoa', { headers: { access_token: token } });
}

export async function uploadFile(oaId: string, bytes: Buffer, name: string, mime: string) {
  const token = await getValidAccessToken(oaId);
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), name);
  return call('https://openapi.zalo.me/v2.0/oa/upload/file', { method: 'POST', headers: { access_token: token }, body: form });
}

export async function sendFile(oaId: string, userId: string, fileToken: string) {
  return sendConsultationMessage(oaId, { recipient: { user_id: userId }, message: { attachment: { type: 'file', payload: { token: fileToken } } } });
}

export async function sendRatingInvitation(oaId: string, userId: string, miniAppUrl: string) {
  const text = `Trung tâm Phục vụ Hành chính công\n\nGiấy hẹn trả kết quả đã được phát hành.\nVui lòng xem giấy hẹn đính kèm và đánh giá chất lượng phục vụ tại:\n${miniAppUrl}`;
  return sendConsultationMessage(oaId, { recipient: { user_id: userId }, message: { text } });
}

export async function getConversation(oaId: string, userId: string, offset = 0, count = 10) {
  const token = await getValidAccessToken(oaId);
  const data = encodeURIComponent(JSON.stringify({ user_id: userId, offset, count }));
  return call(`https://openapi.zalo.me/v2.0/oa/conversation?data=${data}`, { headers: { access_token: token } });
}
