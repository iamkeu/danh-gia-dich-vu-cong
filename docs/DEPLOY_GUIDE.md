# Hướng dẫn triển khai — Đánh giá Dịch vụ Công

- Production: `https://danh-gia-dich-vu-cong.vercel.app`
- OAuth callback: `https://danh-gia-dich-vu-cong.vercel.app/api/zalo/oauth/callback`
- Webhook: `https://danh-gia-dich-vu-cong.vercel.app/api/webhook/zalo`

## Environment Variables

```env
NEXT_PUBLIC_APP_URL=https://danh-gia-dich-vu-cong.vercel.app
ZALO_APP_ID=...
ZALO_APP_SECRET=...
ZALO_OA_ID=...
ZALO_MINI_APP_ID=...
OA_WEBHOOK_SECRET=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_SERVICE_JWT_SECRET=...
TOKEN_ENCRYPTION_KEY=...
SUPABASE_STORAGE_BUCKET=appointment-files
```

Các secret phải để encrypted trên Vercel, không commit vào GitHub. `code_verifier` PKCE được sinh ngẫu nhiên theo từng phiên OAuth; không tạo env cố định cho verifier.

## Xác minh domain bằng meta

Khi mở callback không có tham số OAuth, HTML trả thẻ meta ở đầu `head`:

```html
<meta name="zalo-platform-site-verification" content="PSMZ8B3742mxnh4uulDbDGVivJRhcZvfDJas" />
```

Kiểm tra bằng View Source tại:
`https://danh-gia-dich-vu-cong.vercel.app/api/zalo/oauth/callback/`

Project không cấu hình chặn theo quốc gia hoặc IP; request từ IP nước ngoài được phép đi qua Vercel và callback không cần truy cập database ở chế độ xác minh.

## Luồng vận hành

1. Cán bộ tạo hồ sơ và upload PDF.
2. Liên kết hồ sơ với Zalo UID.
3. Bấm gửi; backend gửi PDF và tin OA chứa URL Mini App có token.
4. Công dân mở Mini App; SDK trả `getUserID()`.
5. Mini App lấy hồ sơ theo token và gửi đánh giá vào Backend.

Sản phẩm không có ZBS, ZNS, Vote template hoặc màn hình quản lý template.
