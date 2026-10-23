# Zalo Mini App — Đánh giá Dịch vụ Công

Project Mini App độc lập, tách khỏi Next.js backend.

## Điểm quan trọng về `Use ZMP to deploy only`

Theo tài liệu Zalo hiện hành, khi chọn **Use ZMP to deploy only**, CLI bổ sung các file triển khai cần thiết, chủ yếu là `.env` và `app-config.json`. Project này **không nhất thiết có `zmp-cli.json`**.

Với chế độ này:

- Dùng `npm run dev` hoặc `npm run preview` để chạy local.
- Không dùng `zmp start` nếu CLI báo `This is not ZMP project`.
- Dùng `zmp deploy` để upload bản Development/Testing lên Zalo.

## Cài đặt

```bash
npm install
npm run typecheck
npm run build
```

Nếu TypeScript báo `Cannot find module 'zmp-sdk'`, nguyên nhân là dependency chưa được cài trong chính thư mục `miniapp`. Chạy đúng các lệnh sau:

```bash
cd miniapp
npm ci
npm run typecheck
npm run build
```

Không chạy `npm run typecheck` từ thư mục gốc thay cho thư mục `miniapp`. Nếu thư mục `node_modules` đang dở dang, có thể xóa rồi cài lại:

```bash
rm -rf node_modules
npm ci
```

Trên Windows PowerShell dùng `Remove-Item -Recurse -Force node_modules` thay cho `rm -rf node_modules`. Gói `zmp-sdk` đã có sẵn trong `package.json` và `package-lock.json`, không cần tự tạo file khai báo TypeScript hoặc cài thủ công bằng một phiên bản khác.

Trước khi build bản dùng thật, tạo/cập nhật file `.env` ở thư mục Mini App:

```env
VITE_API_BASE_URL=https://danh-gia-dich-vu-cong.vercel.app
VITE_MINI_APP_ID=1935626247338797046
VITE_ZALO_OA_ID=2171288717091266997
```

`VITE_ZALO_OA_ID` là OA đã liên kết với Mini App. Đây là ID công khai, nhưng không đưa Zalo App Secret hoặc access token vào Mini App.

## Cấu hình source có sẵn với ZMP CLI

```bash
npm install -g zmp-cli
zmp login
zmp init
```

Khi CLI hỏi, chọn **Use ZMP to deploy only**, nhập Mini App ID thật của `danh-gia-dvc` và giữ source hiện tại.

Không xóa `.env` hoặc `app-config.json` do CLI tạo.

## Chạy local trên trình duyệt

```bash
npm run dev
```

Hoặc chạy đúng bản production build:

```bash
npm run build
npm run preview
```

## Deploy lên Zalo

```bash
zmp deploy
```

Chọn `Development` để kiểm tra nhanh hoặc `Testing` để tạo bản test lưu trong quản lý phiên bản.

## Asset build

`app-config.json` khai báo:

```json
{
  "listCSS": ["assets/index.css"],
  "listSyncJS": ["assets/index.module.js"]
}
```

`vite.config.ts` đã được cấu hình tên asset ổn định để sau mỗi lần build không phải sửa hash thủ công.

Vite được cấu hình `base: "./"` và entry bundle có hậu tố `.module.js` theo hướng dẫn chuyển đổi Web App của Zalo. Đây là bắt buộc khi Zalo nạp bundle qua `listSyncJS` từ CDN theo version Mini App.

## Backend

Mini App gọi backend production:

```text
https://danh-gia-dich-vu-cong.vercel.app
```

Backend cần được cấu hình `ZALO_MINI_APP_ID` trên Vercel để OA gửi link dạng:

```text
https://zalo.me/s/{MINI_APP_ID}/?token=...
```

## Flow

1. Đọc `token` từ query string.
2. Gọi `getUserID()` để lấy App UID phụ trợ.
3. Gọi `getUserInfo()` và lấy `userInfo.idByOA`.
4. Nếu chưa có `idByOA`, gọi `followOA({ id: VITE_ZALO_OA_ID })` sau khi công dân bấm nút quan tâm OA.
5. Gọi lại `getUserInfo()` và hiển thị nút “Xác nhận nhận kết quả hồ sơ”.
6. Gửi `token` và `oaUid` đến API xác nhận để liên kết đúng hồ sơ.
7. Gọi API lấy hồ sơ bằng token và hiển thị giấy hẹn/PDF.
8. Công dân chọn 1–5 sao, nhập góp ý tùy chọn.
9. Nếu có góp ý, bắt buộc tick checkbox đồng ý.
10. Gửi `token`, `oaUid`, `stars`, `comment`, `commentConsent` về backend.

## Nguồn chính thức

- https://docs.zaloplatforms.com/docs/MA/devtools/cli/init
- https://docs.zaloplatforms.com/docs/MA/devtools/cli/deploy
- https://docs.zaloplatforms.com/docs/MA/intro/getting-started/convert-web-app-to-mini-app
