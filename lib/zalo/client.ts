import { getValidAccessToken } from './token-store';

async function call(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`ZALO_${body.error || response.status}:${body.message || 'API error'}`);
  return body;
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
  const token = await getValidAccessToken(oaId);
  return call('https://openapi.zalo.me/v3.0/oa/message/cs', {
    method: 'POST',
    headers: { access_token: token, 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { attachment: { type: 'file', payload: { token: fileToken } } } }),
  });
}

export async function sendRatingInvitation(oaId: string, userId: string, miniAppUrl: string) {
  const token = await getValidAccessToken(oaId);
  const text = `Trung tâm Phục vụ Hành chính công\n\nGiấy hẹn trả kết quả đã được phát hành.\nVui lòng xem giấy hẹn đính kèm và đánh giá chất lượng phục vụ tại:\n${miniAppUrl}`;
  return call('https://openapi.zalo.me/v3.0/oa/message/cs', {
    method: 'POST',
    headers: { access_token: token, 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
  });
}
