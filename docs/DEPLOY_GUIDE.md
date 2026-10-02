# Hướng dẫn cấu hình Vercel — Đánh giá Dịch vụ Công

Tài liệu này dùng cho **project mới hoàn toàn**, không dùng `oavote`, `zoa-gw` hoặc `zoa-vote-gateway`.

## 1. Thông tin hệ thống chính xác

| Thành phần | Giá trị |
|---|---|
| GitHub repository | `iamkeu/danh-gia-dich-vu-cong` |
| Vercel project | `danh-gia-dich-vu-cong` |
| Vercel project ID | `prj_syL3vBQa4RBKFevMvTj5TEU9az1y` |
| Preview URL hiện tại | `https://danh-gia-dich-vu-cong.vercel.app` |
| Supabase project | `danh-gia-dich-vu-cong` |
| Supabase ref | `sixhitrjkwvwxqefwcup` |
| Supabase region | `ap-southeast-1` |
| Supabase API URL | `https://sixhitrjkwvwxqefwcup.supabase.co` |
| Storage bucket | `danh-gia-dich-vu-cong-files` |

Project `oavote` đã được **pause**, không được dùng làm database của hệ thống này.

## 2. Các biến đã cấu hình tự động trên Vercel

Các biến sau đã được thêm cho cả **Production, Preview và Development**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_APP_URL`
- `PUBLIC_SERVICE_JWT_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `CRON_SECRET`
- `MAX_FILE_SIZE_BYTES=5242880`
- `FILE_RETENTION_HOURS=24`
- `FAILED_FILE_RETENTION_HOURS=72`

Các secret đã được lưu dưới dạng encrypted trên Vercel. Không đưa giá trị secret vào GitHub, tài liệu công khai hoặc tin nhắn.

## 3. Hai nhóm biến cần bổ sung thủ công

### 3.1 `SUPABASE_SERVICE_ROLE_KEY`

Biến này bắt buộc cho API server-side vì backend cần đọc/ghi database và private Storage bằng service role.

Cách lấy:

1. Mở [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn project **danh-gia-dich-vu-cong**.
3. Vào **Project Settings → API**.
4. Tìm **Project API keys**.
5. Sao chép key có nhãn **service_role** hoặc **secret**. Không dùng key `anon`.
6. Mở [Vercel Dashboard](https://vercel.com/dashboard) → chọn project **danh-gia-dich-vu-cong**.
7. Vào **Settings → Environment Variables → Add New**.
8. Nhập:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** dán service role key
   - **Environments:** chọn `Production`, `Preview`, `Development`
   - **Sensitive/Encrypted:** bật nếu giao diện có lựa chọn này
9. Bấm **Save**.

Không gửi service role key qua chat và không commit vào GitHub.

### 3.2 Các biến Zalo

Chỉ thêm sau khi đã có Zalo App/OA thật:

| Key | Giá trị lấy từ đâu |
|---|---|
| `ZALO_APP_ID` | App Console của Zalo |
| `ZALO_APP_SECRET` | App Console của Zalo; lưu encrypted |
| `OA_WEBHOOK_SECRET` | App Console → Webhook; lưu encrypted |
| `OAUTH_CALLBACK_URL` | `https://danh-gia-dich-vu-cong.vercel.app/api/zalo/oauth/callback` |

`ZALO_APP_SECRET` và `OA_WEBHOOK_SECRET` phải chọn kiểu **Sensitive/Encrypted**. Không tạo hoặc nhập `ZALO_OAUTH_CODE_VERIFIER`: backend tự sinh một verifier mới cho mỗi phiên OAuth, lưu tạm trong cookie HttpOnly có chữ ký và xóa sau callback thành công.

## 4. Redeploy sau khi thêm env

Sau mỗi lần thêm hoặc sửa env:

1. Vào Vercel project **danh-gia-dich-vu-cong**.
2. Chọn tab **Deployments**.
3. Mở deployment mới nhất.
4. Chọn menu **⋯ → Redeploy**.
5. Khi vừa thay `SUPABASE_SERVICE_ROLE_KEY` hoặc migration, chọn **Redeploy without cache** nếu có lựa chọn.

## 5. Kiểm tra sau cấu hình

### 5.1 Kiểm tra website

Mở:

```text
https://danh-gia-dich-vu-cong.vercel.app/
```

Kết quả mong đợi: HTTP 200.

### 5.2 Kiểm tra API chưa đăng nhập

Mở:

```text
https://danh-gia-dich-vu-cong.vercel.app/api/public-service/cases
```

Khi đủ env, kết quả mong đợi là HTTP `401` với mã `UNAUTHENTICATED`, không phải HTTP `500`.

### 5.3 Kiểm tra database

Trong Supabase Dashboard → **Table Editor**, phải thấy tối thiểu:

- `admin_accounts`
- `service_cases`
- `service_case_tokens`
- `service_case_links`
- `service_ratings`
- `service_notification_attempts`
- `service_case_audit_logs`

RLS phải bật cho các bảng này.

## 6. Cấu hình callback Zalo

1. Trong Zalo App Console, khai báo callback:
   `https://danh-gia-dich-vu-cong.vercel.app/api/zalo/oauth/callback`
2. Khai báo webhook:
   `https://danh-gia-dich-vu-cong.vercel.app/api/webhook/zalo`
3. Bật đúng các event webhook cần dùng.
4. Cập nhật các biến Zalo trên Vercel.
5. Redeploy.

## 7. Nguyên tắc an toàn

- Không dùng URL/key của `oavote`.
- Không dùng `zoa-gw` làm callback hoặc production URL.
- Không gửi `SUPABASE_SERVICE_ROLE_KEY` cho người khác.
- Không commit `.env.local`.
- Không xóa hoặc reset migration đã chạy trên project mới.
- Trước pilot phải chạy mock Zalo, integration test, contract test và E2E trên Preview.
