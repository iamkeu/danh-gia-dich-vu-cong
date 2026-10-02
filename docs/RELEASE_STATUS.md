# Trạng thái release — Đánh giá Dịch vụ Công

## Kết luận hiện tại

Hệ thống đã có **Preview deployment chạy được**, nhưng **chưa go-live nghiệp vụ**.

Lý do chưa go-live:

1. Cần thêm `SUPABASE_SERVICE_ROLE_KEY` vào Vercel.
2. Cần khai báo `ZALO_APP_ID` và `ZALO_APP_SECRET`.
3. Cần kiểm thử OAuth OA thật trên tài khoản Zalo OA được cấp quyền.
4. Các màn hình Mini App công dân và UI hồ sơ hành chính đầy đủ vẫn đang ở giai đoạn API foundation.

## URL

- Preview mới nhất: `https://danh-gia-dich-vu-cong-c55g5lv1w-keithnguyenquang-4642.vercel.app`
- Vercel project: `danh-gia-dich-vu-cong`
- Supabase project: `danh-gia-dich-vu-cong`
- Supabase ref: `sixhitrjkwvwxqefwcup`

## Tài khoản admin test

Tài khoản đã được tạo trong bảng `public.admin_accounts` của Supabase project mới.

Không commit mật khẩu vào repository. Lấy thông tin credential từ người quản lý dự án trong kênh bảo mật.

Trang đăng nhập: `/login`

## Các route chính đã có

- `POST /api/public-service/auth/login`
- `POST /api/public-service/auth/logout`
- `GET/POST /api/public-service/cases`
- `GET /api/public-service/cases/by-token/[token]`
- `POST /api/public-service/ratings`
- `GET /api/zalo/oauth/start`
- `GET /api/zalo/oauth/callback`
- `GET /api/zalo/status`
- `GET /api/zalo/templates`
- `POST /api/webhook/zalo`

## Zalo OA cần gì?

Cần **cả hai**:

- **Zalo App:** ứng dụng OAuth/OpenAPI chứa App ID và App Secret.
- **Zalo Official Account (OA):** tài khoản OA thật mà App được cấp quyền quản lý.

Chỉ có Zalo App thì chưa gửi được tin qua OA. OA ID được trả về trong callback sau khi admin cấp quyền; không cần nhập OA ID thủ công vào ENV.

## Biến Vercel cần bổ sung

```text
SUPABASE_SERVICE_ROLE_KEY
ZALO_APP_ID
ZALO_APP_SECRET
```

Callback URL cần khai báo trong Zalo App Console:

```text
https://danh-gia-dich-vu-cong-c55g5lv1w-keithnguyenquang-4642.vercel.app/api/zalo/oauth/callback
```

Sau khi thêm biến, cần Redeploy deployment mới nhất.
