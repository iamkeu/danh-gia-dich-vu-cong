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
  "listSyncJS": ["assets/index.js"]
}
```

`vite.config.ts` đã được cấu hình tên asset ổn định để sau mỗi lần build không phải sửa hash thủ công.

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
4. Gọi API lấy hồ sơ bằng token.
5. Hiển thị giấy hẹn và PDF.
6. Công dân chọn 1–5 sao, nhập góp ý tùy chọn.
7. Nếu có góp ý, bắt buộc tick checkbox đồng ý.
8. Gửi `token`, `oaUid`, `stars`, `comment`, `commentConsent` về backend.

## Nguồn chính thức

- https://docs.zaloplatforms.com/docs/MA/devtools/cli/init
- https://docs.zaloplatforms.com/docs/MA/devtools/cli/deploy
- https://docs.zaloplatforms.com/docs/MA/intro/getting-started/convert-web-app-to-mini-app
