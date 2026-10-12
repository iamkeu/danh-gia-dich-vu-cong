# Zalo Mini App — Đánh giá Dịch vụ Công

Project Mini App độc lập, tách khỏi Next.js backend.

## Cài đặt

```bash
npm install
npm run typecheck
npm run build
```

## Chạy local

```bash
npm run dev
```

## Chạy bằng ZMP CLI

Từ thư mục này:

```bash
npm install -g zmp-cli
zmp login
zmp init
```

Khi `zmp init` hỏi, chọn **Use ZMP to deploy only**, nhập Mini App ID thật và giữ source hiện tại.

> Không đưa `ZALO_APP_SECRET`, Supabase service role key hoặc JWT secret vào project này.

## Deploy

```bash
zmp start
zmp start -D
zmp deploy
```

Chọn `Development` để kiểm tra nhanh hoặc `Testing` để tạo bản test lưu trong quản lý phiên bản.

## URL/backend

Mini App gọi backend production:

```text
https://danh-gia-dich-vu-cong.vercel.app
```

Backend cần được cấu hình `ZALO_MINI_APP_ID` trên Vercel để OA gửi link dạng `https://zalo.me/s/{MINI_APP_ID}/?token=...`.

## Flow

1. Đọc `token` từ query string.
2. Gọi `getUserID()` để lấy App UID phụ trợ.
3. Gọi `getUserInfo()` và lấy `userInfo.idByOA`.
4. Gọi API lấy hồ sơ bằng token.
5. Hiển thị giấy hẹn và PDF.
6. Công dân chọn 1–5 sao, nhập góp ý tùy chọn.
7. Nếu có góp ý, bắt buộc tick checkbox đồng ý.
8. Gửi `token`, `oaUid`, `stars`, `comment`, `commentConsent` về backend.
