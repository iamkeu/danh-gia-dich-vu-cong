# Kiến trúc — Đánh giá Dịch vụ Công

```text
Citizen → Zalo OA → Mini App
                       ├─ getUserID()
                       └─ token
                           ↓
                    Backend API trên Vercel
                       ├─ Users
                       ├─ Cases
                       └─ Ratings
                           ↓
                 Supabase PostgreSQL + Storage
```

## Thành phần

- Zalo OA: gửi PDF giấy hẹn và đường dẫn Mini App.
- Mini App: hiển thị hồ sơ đã xác định, lấy UID, gửi rating.
- Backend: kiểm tra token/UID, gọi OA API, ghi dữ liệu.
- Supabase: Users/Cases/Ratings, audit và Storage private.
- Vercel: giao diện quản trị, Mini App web fallback và API.

## Bảng nghiệp vụ

`admin_accounts`, `service_cases`, `service_case_tokens`, `service_case_links`, `service_ratings`, `service_notification_attempts`, `service_case_audit_logs`.

## Bảo mật

Secret Zalo/Supabase service role chỉ ở backend. PDF ở bucket private và chỉ cấp signed URL ngắn hạn. UID được hash hoặc mã hóa. Webhook kiểm tra `X-ZEvent-Signature`. Không yêu cầu phone, location, camera hoặc đăng nhập công dân.

## Gửi và retry

Một hồ sơ có hai phần độc lập: `appointment_file` và `rating_invitation`. Mỗi phần có trạng thái `pending`, `processing`, `sent`, `failed`; retry không gửi lại phần đã thành công.

Hệ thống không sử dụng ZBS, ZNS, Vote template, transaction legacy hoặc cơ sở dữ liệu OAvote.
