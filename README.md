# Đánh giá Dịch vụ Công — GitHub + Vercel + Supabase

Hệ thống hỗ trợ cán bộ tạo hồ sơ dịch vụ công, liên kết công dân với Zalo OA, gửi giấy hẹn PDF và mời công dân đánh giá 1–5 sao qua Zalo Mini App.

## Repository chính

- GitHub: `iamkeu/danh-gia-dich-vu-cong`
- Branch production dự kiến: `main`
- Supabase: project `danh-gia-dich-vu-cong` (ref `sixhitrjkwvwxqefwcup`)
- Vercel: project `danh-gia-dich-vu-cong` đã liên kết với repository này; các project `zoa-gw`/`zoa-vote-gateway` chỉ là tài nguyên tham chiếu/legacy và không phải repository chính.

## Trạng thái hiện tại

Foundation đã có:

- Next.js full-stack và API route trên Vercel;
- migration additive cho `admin_accounts`, `service_cases`, `service_case_tokens`, `service_case_links`, `service_ratings`, `service_notification_attempts` và audit log;
- JWT email/password module server-side cho nghiệp vụ mới;
- API tạo/liệt kê hồ sơ, tra cứu bằng token opaque, liên kết OA UID và gửi đánh giá;
- mock-friendly Zalo client hiện hữu cho OAuth, upload file, ZBS template, webhook và reconcile;
- unit test password/token, typecheck và production build.

Chi tiết kế hoạch: [`docs/IMPLEMENTATION_PLAN_PUBLIC_SERVICE_RATING.md`](docs/IMPLEMENTATION_PLAN_PUBLIC_SERVICE_RATING.md).

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Kiểm tra chất lượng:

```bash
npm test
npm run typecheck
npm run build
```

Không commit `.env.local`, service-role key, Zalo secret, webhook secret hoặc JWT secret.

## Triển khai

1. GitHub push branch/merge vào `main`.
2. Vercel project `danh-gia-dich-vu-cong` đã import repository `iamkeu/danh-gia-dich-vu-cong` và cấu hình Root Directory là thư mục chứa `package.json`.
3. Supabase migration được quản lý bằng file versioned trong `supabase/migrations/`; không dùng thao tác destructive trên production.
4. Cấu hình callback Zalo và webhook sau khi domain Vercel của repository này đã được xác định.
5. Chỉ promote Production sau khi Preview đã chạy smoke test và test giả lập đầy đủ.

## Tài liệu dự án

Các file yêu cầu/đặc tả ban đầu nằm trong `docs/project/`. Tài liệu Zalo được kiểm chứng và các quyết định đã xác nhận được giữ cùng project workspace; mọi thay đổi API phải cập nhật contract và test tương ứng.
