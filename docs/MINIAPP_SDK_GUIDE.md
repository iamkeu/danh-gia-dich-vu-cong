# Hướng dẫn tích hợp Zalo Mini App SDK

Tài liệu này dành cho người triển khai Mini App **Đánh giá Dịch vụ Công**.

## 1. Kiến trúc chính xác

```text
Zalo OA
  ↓ URL: https://zalo.me/s/{MINI_APP_ID}/?token=...
Zalo Mini App
  ├─ đọc token
  ├─ getUserInfo() → userInfo.idByOA
  ├─ GET /api/public-service/cases/by-token/{token}
  └─ POST /api/public-service/ratings
Vercel Backend → Supabase
```

> `getUserID()` trả về ID theo Zalo App. Khi gửi và đối chiếu người dùng theo OA, ưu tiên `userInfo.idByOA` từ `getUserInfo()`.

## 2. Điều kiện cần chuẩn bị

1. Có Zalo App đang liên kết với OA `CN1 Trung tâm phục vụ Hành chính công HN`.
2. Tạo Mini App trong [Mini App Developers](https://mini.zalo.me/developers/).
3. Xác thực Mini App với OA.
4. Ghi lại `MINI_APP_ID`.
5. Đảm bảo người dùng test đã quan tâm OA.

Theo tài liệu chính thức, Mini App phải được tạo trong một Zalo App; sau đó có thể tự xây dựng, xin quyền, xác thực và phát hành.

Nguồn:

- [Triển khai Zalo Mini App](https://miniapp.zaloplatforms.com/documents/intro/getting-started/)
- [Tạo project bằng Command Line](https://miniapp.zaloplatforms.com/documents/intro/dev-use-command-line/)
- [getUserID](https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getUserID)
- [getUserInfo](https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getUserInfo)

## 3. Khởi tạo SDK bằng ZMP CLI

### Cách khuyến nghị: tạo project mới

```bash
npx create-zalo-mini-app public-service-rating-miniapp
cd public-service-rating-miniapp
npm start
```

### Nếu dùng source Mini App đã có

Từ thư mục Mini App:

```bash
npm install -g zmp-cli
zmp init
```

Khi CLI hỏi:

1. Nhập `MINI_APP_ID`.
2. Đăng nhập tài khoản Zalo Developer có quyền trên App.
3. Chọn **Using ZMP to deploy only** nếu source đã có sẵn.
4. Chạy cài dependency và chạy local.

ZMP project sử dụng root DOM node là:

```html
<div id="app"></div>
```

## 4. Environment/backend

Trên Vercel thêm biến:

```env
ZALO_MINI_APP_ID=MINI_APP_ID_THAT
NEXT_PUBLIC_APP_URL=https://danh-gia-dich-vu-cong.vercel.app
```

Sau khi thêm `ZALO_MINI_APP_ID`, backend sẽ tạo URL:

```text
https://zalo.me/s/{ZALO_MINI_APP_ID}/?token={opaque-token}
```

Nếu chưa có Mini App ID, backend tạm dùng:

```text
https://danh-gia-dich-vu-cong.vercel.app/miniapp?token={opaque-token}
```

URL fallback chỉ dùng để test trình duyệt, không dùng làm link gửi chính thức cho công dân.

## 5. Adapter SDK dùng trong Mini App thật

Tạo `src/services/zaloIdentity.ts`:

```ts
import { getUserID, getUserInfo } from 'zmp-sdk';

export type CitizenIdentity = {
  appUid: string;
  oaUid: string;
  followedOA?: boolean;
};

export async function readCitizenIdentity(): Promise<CitizenIdentity> {
  const appUid = await getUserID({});
  const result = await getUserInfo({ autoRequestPermission: false });
  const user = result.userInfo;

  if (!user?.idByOA) {
    throw new Error(
      'Không lấy được idByOA. Hãy xác thực Mini App với OA và kiểm tra người dùng đã quan tâm OA.'
    );
  }

  return {
    appUid,
    oaUid: user.idByOA,
    followedOA: user.followedOA,
  };
}
```

Không dùng `name`, `avatar` hoặc `phone` làm khóa định danh. Tên/avatar chỉ xin khi thật sự cần và phải giải thích mục đích cho người dùng.

## 6. API client

Tạo `src/services/publicServiceApi.ts`:

```ts
export type CaseData = {
  case_code: string;
  procedure_name: string;
  department_name: string;
  officer_name: string;
  appointment_date?: string | null;
  pdfUrl?: string | null;
  alreadyRated?: boolean;
};

const apiBase = 'https://danh-gia-dich-vu-cong.vercel.app';

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'API request failed');
  return payload.data as T;
}

export function getCaseByToken(token: string) {
  return fetch(`${apiBase}/api/public-service/cases/by-token/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  }).then(parse<CaseData>);
}

export function submitRating(input: {
  token: string;
  oaUid: string;
  stars: number;
  comment: string;
  commentConsent: boolean;
}) {
  return fetch(`${apiBase}/api/public-service/ratings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then(parse<{ id: string }>);
}
```

## 7. Component màn hình hoàn chỉnh

Tạo `src/pages/RatingPage.tsx`:

```tsx
import { FormEvent, useEffect, useState } from 'react';
import { readCitizenIdentity } from '../services/zaloIdentity';
import { getCaseByToken, submitRating, CaseData } from '../services/publicServiceApi';

export default function RatingPage() {
  const [token] = useState(() => new URLSearchParams(location.search).get('token') || '');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [oaUid, setOaUid] = useState('');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('Liên kết hồ sơ không hợp lệ.');
      setLoading(false);
      return;
    }

    Promise.all([getCaseByToken(token), readCitizenIdentity()])
      .then(([data, identity]) => {
        setCaseData(data);
        setOaUid(identity.oaUid);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stars) return setMessage('Vui lòng chọn số sao.');
    if (comment.trim() && !consent) return setMessage('Vui lòng đồng ý cho phép sử dụng góp ý.');
    if (!oaUid) return setMessage('Không xác định được người dùng theo OA.');

    setLoading(true);
    try {
      await submitRating({ token, oaUid, stars, comment: comment.trim(), commentConsent: consent });
      setSubmitted(true);
      setMessage('Đã ghi nhận đánh giá. Cảm ơn Anh/Chị.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi đánh giá.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <main>Đang tải giấy hẹn…</main>;
  if (!caseData) return <main>{message || 'Không có dữ liệu hồ sơ.'}</main>;
  if (submitted || caseData.alreadyRated) return <main><h1>Đã ghi nhận đánh giá</h1><p>{message}</p></main>;

  return (
    <main>
      <section>
        <small>GIẤY HẸN TRẢ KẾT QUẢ</small>
        <h1>{caseData.case_code}</h1>
        <p>{caseData.procedure_name}</p>
        <p>Đơn vị: {caseData.department_name || 'Chưa cập nhật'}</p>
        <p>Ngày hẹn: {caseData.appointment_date || 'Chưa cập nhật'}</p>
        {caseData.pdfUrl && <a href={caseData.pdfUrl}>Mở giấy hẹn PDF</a>}
      </section>

      <form onSubmit={onSubmit}>
        <h2>Đánh giá trải nghiệm</h2>
        <div role="radiogroup" aria-label="Mức độ hài lòng">
          {[1, 2, 3, 4, 5].map((value) => (
            <button type="button" key={value} onClick={() => setStars(value)} aria-label={`${value} sao`} aria-checked={stars === value} role="radio">
              {value <= stars ? '★' : '☆'}
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Góp ý thêm (không bắt buộc)" />
        <label>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          Tôi đồng ý cho phép đơn vị sử dụng góp ý này để cải thiện chất lượng phục vụ.
        </label>
        {message && <p role="alert">{message}</p>}
        <button type="submit" disabled={loading || !stars}>Gửi đánh giá</button>
      </form>
    </main>
  );
}
```

## 8. Checklist test SDK

### Test trong Zalo

- [ ] Mở link Mini App có `token` từ OA.
- [ ] `getUserID()` trả về App UID.
- [ ] `getUserInfo()` trả `idByOA`.
- [ ] Tài khoản test đã follow OA.
- [ ] API case trả đúng hồ sơ.
- [ ] PDF mở được bằng signed URL.
- [ ] Chọn 1–5 sao.
- [ ] Có góp ý nhưng chưa tick consent thì không gửi được.
- [ ] Tick consent và gửi thành công.
- [ ] Gửi lần hai bị từ chối vì đã đánh giá.
- [ ] Token hết hạn trả lỗi rõ ràng.

### Test trình duyệt fallback

```text
https://danh-gia-dich-vu-cong.vercel.app/miniapp?token={TOKEN}&test=1
```

`test=1` chỉ dành cho kiểm thử nội bộ. Không dùng fallback OA UID trong production thật.

## 9. Build và publish

```bash
npm install
npm start
```

Trong ZMP DevTools:

1. Chọn project Mini App.
2. Chạy local preview.
3. Kiểm tra API production.
4. Upload/build bản test.
5. Mời tài khoản test sử dụng.
6. Sửa lỗi nếu có.
7. Gửi xác thực Mini App.
8. Phát hành bản production.

Không đưa secret Supabase hoặc Zalo App Secret vào source Mini App. Mini App chỉ gọi Backend Vercel.
