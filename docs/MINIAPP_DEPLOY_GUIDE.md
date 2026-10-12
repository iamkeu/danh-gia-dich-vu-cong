# Hướng dẫn cài đặt và deploy source lên Zalo Mini App

## 1. Kết luận quan trọng trước khi bắt đầu

Repository hiện tại gồm hai phần khác nhau:

```text
/home/ubuntu/workspaces/danh-gia-dich-vu-cong
├── app/miniapp/                         # web fallback trên Next.js
├── app/api/public-service/...            # Backend API chạy trên Vercel
├── lib/...                               # logic backend
└── docs/...                              # tài liệu
```

`app/miniapp/page.tsx` hiện là **màn hình web fallback của Next.js**, không phải một project Zalo Mini App độc lập hoàn chỉnh. Vì vậy:

- Không chạy `zmp deploy` trực tiếp ở thư mục gốc repository Next.js.
- Không đưa secret Supabase hoặc Zalo App Secret vào Mini App.
- Backend vẫn chạy trên Vercel.
- Database vẫn chạy trên Supabase.
- Tạo một project Mini App riêng, rồi chép phần giao diện và API client cần thiết sang project đó.

Kiến trúc sau khi triển khai:

```text
Zalo OA
   ↓ https://zalo.me/s/{MINI_APP_ID}/?token=...
Zalo Mini App riêng
   ├── getUserID()
   ├── getUserInfo() → idByOA
   ├── lấy token từ URL
   ├── gọi Backend API
   └── hiển thị giấy hẹn / gửi đánh giá
          ↓ HTTPS
Vercel Backend
   ├── GET /api/public-service/cases/by-token/{token}
   └── POST /api/public-service/ratings
          ↓
Supabase
```

## 2. Những thứ cần chuẩn bị

### 2.1. Tài khoản và quyền

Cần có:

1. Tài khoản Zalo Developer có quyền trên Zalo App.
2. Zalo App đã liên kết với OA **CN1 Trung tâm phục vụ Hành chính công HN**.
3. Mini App ID đã tạo trong Zalo App.
4. Mini App được xác thực bởi OA trước khi phát hành chính thức.
5. Node.js 18 trở lên.
6. Một máy có terminal/Command Prompt.

Tài liệu chính thức:

- [Triển khai Zalo Mini App](https://docs.zaloplatforms.com/docs/MA/intro/getting-started)
- [Tạo dự án bằng CLI](https://docs.zaloplatforms.com/docs/MA/devtools/cli/init)
- [Khởi động local](https://docs.zaloplatforms.com/docs/MA/devtools/cli/start)
- [Xuất bản](https://docs.zaloplatforms.com/docs/MA/devtools/cli/deploy)

### 2.2. Giá trị cần ghi lại

Ghi lại `MINI_APP_ID` nhưng không gửi App Secret vào chat hoặc đưa vào source:

```text
ZALO_MINI_APP_ID=giá-trị-do-Zalo-cấp
```

## 3. Cấu hình Backend Vercel trước

Đăng nhập Vercel, chọn project:

```text
Danh-gia-dich-vu-cong
```

Vào:

```text
Settings → Environment Variables
```

Thêm biến sau cho **Production**:

```env
ZALO_MINI_APP_ID=MINI_APP_ID_THAT
NEXT_PUBLIC_APP_URL=https://danh-gia-dich-vu-cong.vercel.app
```

Sau đó bấm **Redeploy** deployment Production.

Khi có `ZALO_MINI_APP_ID`, backend sẽ tạo link Mini App dạng:

```text
https://zalo.me/s/{MINI_APP_ID}/?token={OPAQUE_TOKEN}
```

Nếu chưa có biến này, backend chỉ tạo web fallback:

```text
https://danh-gia-dich-vu-cong.vercel.app/miniapp?token={OPAQUE_TOKEN}
```

Web fallback chỉ để kiểm thử bằng trình duyệt, không phải link Mini App production chính thức.

## 4. Cài Zalo Mini App CLI

Mở Terminal hoặc PowerShell:

```bash
node --version
npm --version
```

Nếu Node.js chưa có, cài bản LTS từ:

https://nodejs.org/

Cài ZMP CLI:

```bash
npm install -g zmp-cli
```

Kiểm tra:

```bash
zmp --version
```

Đăng nhập:

```bash
zmp login
```

CLI sẽ hiển thị QR hoặc phương thức đăng nhập. Dùng ứng dụng Zalo trên điện thoại để xác nhận nếu được yêu cầu.

## 5. Tạo project Mini App riêng

Không chạy trong thư mục Next.js hiện tại. Tạo thư mục riêng:

```bash
mkdir danh-gia-dich-vu-cong-miniapp
cd danh-gia-dich-vu-cong-miniapp
zmp init
```

Khi CLI hỏi, chọn:

1. **Create a new ZMP project** nếu muốn tạo bộ khung mới.
2. Chọn **TypeScript**.
3. Chọn CSS hoặc SCSS.
4. Nhập `MINI_APP_ID`.
5. Đặt tên hiển thị: `Đánh giá Dịch vụ Công`.
6. Chọn template `blank` nếu muốn dùng giao diện nghiệp vụ riêng.

Theo tài liệu Zalo, `zmp init` có hai chế độ:

- **Create a new ZMP project**: tạo project mới.
- **Use ZMP to deploy only**: chuyển đổi một web app có sẵn để deploy.

Với source hiện tại, **khuyến nghị dùng project Mini App riêng** vì repository gốc còn chứa Next.js backend, middleware và route quản trị không phù hợp để đóng gói vào Mini App.

## 6. Cấu trúc project Mini App cần có

Sau khi khởi tạo, cấu trúc tối thiểu nên là:

```text
 danh-gia-dich-vu-cong-miniapp/
 ├── src/
 │   ├── app.tsx
 │   ├── pages/
 │   │   └── RatingPage.tsx
 │   ├── services/
 │   │   ├── zaloIdentity.ts
 │   │   └── publicServiceApi.ts
 │   └── styles/
 │       └── app.css
 ├── app-config.json
 ├── package.json
 ├── zmp-cli.json
 └── index.html
```

Root DOM của project ZMP là:

```html
<div id="app"></div>
```

Không copy các phần sau từ Next.js vào Mini App:

```text
app/api/
lib/supabase/
lib/authz.ts
.env
.env.local
SUPABASE_SERVICE_ROLE_KEY
ZALO_APP_SECRET
PUBLIC_SERVICE_JWT_SECRET
TOKEN_ENCRYPTION_KEY
```

## 7. Cài SDK trong project Mini App

Từ thư mục `danh-gia-dich-vu-cong-miniapp`:

```bash
npm install
npm install zmp-sdk
```

Tạo file `src/services/zaloIdentity.ts`:

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
      'Không lấy được idByOA. Hãy xác thực Mini App với OA và kiểm tra tài khoản đã quan tâm OA.'
    );
  }

  return {
    appUid,
    oaUid: user.idByOA,
    followedOA: user.followedOA,
  };
}
```

### Vì sao phải dùng `idByOA`?

- `getUserID()` trả ID theo Zalo App.
- `getUserInfo().userInfo.idByOA` là định danh theo OA.
- Backend gửi và đối chiếu người dùng theo OA, nên phải gửi `idByOA`.
- Không dùng số điện thoại, tên, avatar hoặc vị trí làm khóa hồ sơ.

Nếu `idByOA` không có giá trị, kiểm tra:

1. Mini App đã được xác thực bởi đúng OA chưa.
2. Zalo App đã liên kết với OA chưa.
3. Tài khoản test đã follow OA chưa.
4. Người dùng có mở Mini App trong Zalo thật không.

## 8. Cấu hình API client

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

const API_BASE = 'https://danh-gia-dich-vu-cong.vercel.app';

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Không thể kết nối máy chủ.');
  }
  return payload.data as T;
}

export function getCaseByToken(token: string) {
  const url = `${API_BASE}/api/public-service/cases/by-token/${encodeURIComponent(token)}`;
  return fetch(url, { cache: 'no-store' }).then(readResponse<CaseData>);
}

export function submitRating(input: {
  token: string;
  oaUid: string;
  stars: number;
  comment: string;
  commentConsent: boolean;
}) {
  return fetch(`${API_BASE}/api/public-service/ratings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then(readResponse<{ id: string }>);
}
```

## 9. Chuyển màn hình hiện có sang Mini App

Source web fallback hiện tại nằm ở:

```text
app/miniapp/page.tsx
```

File này chứa đầy đủ logic nghiệp vụ và giao diện tham khảo:

- Đọc `token` từ URL.
- Hiển thị giấy hẹn.
- Mở PDF.
- Chọn 1–5 sao.
- Nhập góp ý.
- Tick checkbox đồng ý.
- Gọi API rating.
- Hiển thị lỗi và trạng thái đã đánh giá.

Tuy nhiên file dùng cú pháp Next/React và inline `style jsx`, nên không copy nguyên xi vào project ZMP nếu project ZMP dùng cấu trúc khác. Cần chép lại phần JSX và CSS vào `src/pages/RatingPage.tsx` theo template mà `zmp init` tạo ra.

Giao diện bắt buộc cần có:

```tsx
const [stars, setStars] = useState(0);
const [comment, setComment] = useState('');
const [consent, setConsent] = useState(false);

{[1, 2, 3, 4, 5].map((value) => (
  <button
    type="button"
    aria-label={`${value} sao`}
    onClick={() => setStars(value)}
  >
    {value <= stars ? '★' : '☆'}
  </button>
))}

<textarea
  value={comment}
  maxLength={1000}
  onChange={(event) => setComment(event.target.value)}
  placeholder="Góp ý thêm (không bắt buộc)"
/>

<label>
  <input
    type="checkbox"
    checked={consent}
    onChange={(event) => setConsent(event.target.checked)}
  />
  Tôi đồng ý cho phép đơn vị sử dụng góp ý này để cải thiện chất lượng phục vụ.
</label>
```

Quy tắc submit:

```ts
if (!stars) {
  throw new Error('Vui lòng chọn số sao.');
}

if (comment.trim() && !consent) {
  throw new Error('Vui lòng đồng ý cho phép sử dụng góp ý.');
}

await submitRating({
  token,
  oaUid: identity.oaUid,
  stars,
  comment: comment.trim(),
  commentConsent: consent,
});
```

## 10. Chạy thử trên máy tính

Từ thư mục Mini App:

```bash
zmp start
```

CLI sẽ hiển thị địa chỉ local, thường có dạng:

```text
http://localhost:3000
```

Mở địa chỉ đó bằng Chrome.

Các URL test:

```text
http://localhost:3000/?token=TOKEN_TEST
```

Nếu cần chạy trực tiếp trên điện thoại bằng Zalo:

```bash
zmp start -D
```

CLI sẽ hiển thị QR. Dùng ứng dụng Zalo quét QR.

Theo tài liệu Zalo, Device mode yêu cầu project liên kết với Mini App ID hợp lệ, SDK mới và Vite 2.x; project dùng Webpack có thể không tương thích Device mode.

## 11. Kiểm thử trước khi deploy

### Kiểm thử giao diện

- [ ] Mở app không có token: báo liên kết không hợp lệ.
- [ ] Mở app với token không tồn tại: báo không tìm thấy hồ sơ.
- [ ] Token hết hạn: báo liên kết hết hạn.
- [ ] Hồ sơ có PDF: nút mở PDF hiển thị.
- [ ] Hồ sơ không có PDF: không hiển thị nút lỗi.
- [ ] Chọn từng mức từ 1 đến 5 sao.
- [ ] Không chọn sao: không gửi được.
- [ ] Nhập góp ý nhưng không tick: không gửi được.
- [ ] Chỉ chọn sao không góp ý: gửi được.
- [ ] Tick đồng ý và gửi: hiển thị thành công.
- [ ] Gửi lại: hiển thị đã đánh giá.

### Kiểm thử SDK trong Zalo thật

- [ ] `getUserID()` trả về App UID.
- [ ] `getUserInfo()` trả về `userInfo`.
- [ ] `userInfo.idByOA` có giá trị.
- [ ] `followedOA` đúng với trạng thái follow.
- [ ] Không ghi UID vào log production.
- [ ] API Backend nhận đúng token và OA UID.

### Kiểm thử kết nối Backend

```bash
curl -i https://danh-gia-dich-vu-cong.vercel.app/api/public-service/cases/by-token/TOKEN_TEST
```

Không sử dụng token thật của công dân trong lệnh shell hoặc tài liệu chia sẻ.

## 12. Deploy bản phát triển lên Zalo

Đăng nhập nếu chưa đăng nhập:

```bash
zmp login
```

Deploy bản Development:

```bash
zmp deploy
```

Khi CLI hỏi version status, chọn:

- **Development**: dùng để kiểm tra nhanh; bản mới sẽ ghi đè bản development trước.
- **Testing**: dùng khi cần lưu phiên bản test, mời người kiểm thử và gửi xét duyệt.

Khi cần bản kiểm thử có mã phiên bản cố định, chọn **Testing** và nhập mô tả, ví dụ:

```text
Bản test luồng hiển thị giấy hẹn và gửi đánh giá dịch vụ công.
```

Sau deploy:

1. Mở Mini App từ khu vực quản lý phiên bản.
2. Dùng tài khoản Zalo test đã follow OA.
3. Mở một link có token hợp lệ.
4. Kiểm tra toàn bộ luồng giấy hẹn → sao → góp ý → consent → gửi.
5. Kiểm tra log Vercel và dữ liệu Supabase.

## 13. Phát hành production

Không phát hành ngay sau lần deploy đầu tiên. Quy trình nên là:

1. Deploy `Development`.
2. Test local bằng browser.
3. Test Device mode bằng Zalo thật.
4. Deploy `Testing`.
5. Kiểm thử với nhiều hồ sơ và nhiều tài khoản.
6. Gửi phiên bản kiểm thử để xét duyệt nếu Zalo yêu cầu.
7. Hoàn tất xác thực Mini App và hồ sơ đơn vị.
8. Chọn phiên bản đã kiểm thử để phát hành.
9. Mở lại link từ OA và kiểm tra trên Android/iOS.

Theo tài liệu CLI, bản `Development` phù hợp để kiểm tra nhanh, còn bản `Testing` được lưu trong phần quản lý phiên bản và có thể gửi xem xét/phát hành.

## 14. Checklist production sau deploy

### Luồng công dân

- [ ] OA gửi link Mini App có dạng `https://zalo.me/s/{MINI_APP_ID}/?token=...`.
- [ ] Mini App mở được từ OA.
- [ ] Token được giữ nguyên khi chuyển vào Mini App.
- [ ] `idByOA` được lấy từ SDK.
- [ ] Đúng giấy hẹn được hiển thị.
- [ ] PDF chỉ mở bằng signed URL có thời hạn.
- [ ] Không xem được hồ sơ khác bằng cách sửa token.
- [ ] Đánh giá 1–5 sao thành công.
- [ ] Góp ý không có consent bị từ chối.
- [ ] Đánh giá lần hai bị từ chối.

### Luồng quản trị

- [ ] Cán bộ tạo hồ sơ.
- [ ] Upload PDF.
- [ ] Liên kết công dân với OA UID.
- [ ] Gửi giấy hẹn qua OA.
- [ ] Theo dõi trạng thái gửi.
- [ ] Retry được phần lỗi.
- [ ] Audit log có hoạt động.

### Bảo mật

- [ ] Không có secret trong Mini App bundle.
- [ ] Không log OA UID hoặc token trong production.
- [ ] Token không chứa thông tin cá nhân.
- [ ] API rating kiểm tra token và chống gửi trùng.
- [ ] CORS chỉ cho origin cần thiết nếu backend có mở rộng thêm.

## 15. Các lỗi thường gặp

### Lỗi `idByOA` rỗng

Nguyên nhân thường gặp:

- Mini App chưa xác thực với OA.
- Zalo App chưa liên kết OA.
- Người dùng chưa follow OA.
- Đang mở bằng browser thay vì ứng dụng Zalo.
- Đang dùng sai Mini App ID.

### Lỗi `zmp start -D`

Kiểm tra:

- Project đã có Mini App ID hợp lệ chưa.
- Project có dùng Vite 2.x không.
- Đã cài SDK mới chưa.
- Có đang dùng Webpack không.
- Đăng nhập lại bằng `zmp login`.

### Link vẫn mở web fallback

Kiểm tra trên Vercel:

```env
ZALO_MINI_APP_ID=...
```

Sau khi lưu biến môi trường phải redeploy Production. Không chỉ reload trang quản trị.

### API báo CORS

Mini App gọi API production bằng HTTPS. Nếu phát sinh CORS:

1. Kiểm tra origin được gửi trong request.
2. Kiểm tra backend có trả header cho origin Mini App cần thiết không.
3. Không mở CORS cho mọi origin nếu không cần.
4. Kiểm tra lại bằng Zalo Device mode.

## 16. Tóm tắt lệnh theo đúng thứ tự

```bash
# 1. Cài CLI
npm install -g zmp-cli

# 2. Đăng nhập
zmp login

# 3. Tạo thư mục Mini App riêng
mkdir danh-gia-dich-vu-cong-miniapp
cd danh-gia-dich-vu-cong-miniapp

# 4. Khởi tạo project
zmp init

# 5. Cài dependency
npm install
npm install zmp-sdk

# 6. Chạy local
zmp start

# 7. Chạy trên thiết bị Zalo
zmp start -D

# 8. Deploy bản Development/Testing
zmp deploy
```

## 17. Nguồn chính thức đã đối chiếu

- [Zalo Mini App — Triển khai](https://docs.zaloplatforms.com/docs/MA/intro/getting-started)
- [ZMP CLI — Cài đặt](https://docs.zaloplatforms.com/docs/MA/devtools/cli/intro)
- [ZMP CLI — Đăng nhập](https://docs.zaloplatforms.com/docs/MA/devtools/cli/login)
- [ZMP CLI — Tạo dự án](https://docs.zaloplatforms.com/docs/MA/devtools/cli/init)
- [ZMP CLI — Khởi động](https://docs.zaloplatforms.com/docs/MA/devtools/cli/start)
- [ZMP CLI — Xuất bản](https://docs.zaloplatforms.com/docs/MA/devtools/cli/deploy)
- [getUserID](https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getUserID)
- [getUserInfo](https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getUserInfo)
