# Kế hoạch triển khai — Hệ thống Đánh giá Dịch vụ Công

## 1. Quyết định nền tảng

Repository và codebase chính là `iamkeu/danh-gia-dich-vu-cong`. Vercel project chính là `danh-gia-dich-vu-cong`. Supabase là project riêng `danh-gia-dich-vu-cong` (ref `sixhitrjkwvwxqefwcup`). Các tài nguyên `zoa-gw`, `zoa-vote-gateway` và `oavote` là legacy, không được dùng làm database production của hệ thống mới.

Ứng dụng dùng Next.js full-stack trên Vercel. Backend API, giao diện quản trị và các route callback/webhook nằm trong cùng một deployment. Mã nguồn Mini App được thêm thành package riêng trong cùng monorepo để tái sử dụng shared types/validation, có build adapter theo Zalo Mini App SDK. Việc phát hành Mini App vẫn phải thực hiện qua Mini App Center của Zalo vì đây là bước bắt buộc của nền tảng, nhưng source, CI và artefact build vẫn quản lý trên GitHub.

## 2. Phạm vi MVP sau khi đối chiếu code hiện hữu

MVP phải hỗ trợ:

- cán bộ đăng nhập, tạo hồ sơ, nhập mã hồ sơ/thủ tục/phòng ban/cán bộ/ngày hẹn;
- liên kết `zalo_uid_oa` bằng QR/link tại quầy hoặc nhập dự phòng có audit log;
- upload PDF giấy hẹn vào private Supabase Storage;
- tạo token opaque ngắn hạn, không đưa mã hồ sơ/citizen id lên URL công khai;
- gửi một luồng OA gồm file giấy hẹn và lời mời đánh giá theo provider/adapter phù hợp với quyền Zalo thực tế;
- Mini App lấy token, gọi backend, hiển thị hồ sơ tối thiểu, chấm 1–5 sao và nhập góp ý tự do;
- backend chống đánh giá trùng theo hồ sơ và UID OA, xác thực token, giới hạn comment 1.000 ký tự và lưu consent khi có comment;
- lưu trạng thái gửi, message ID, lỗi, retry history và audit log;
- test mock toàn bộ Zalo SDK/API/webhook và test thực tế qua OA Test/Mini App test trước release.

Dashboard phân tích chi tiết chưa nằm trong MVP, nhưng schema, API boundary và RBAC phải chừa sẵn.

## 3. Những gì tái sử dụng từ `zoa-gw`

Có thể giữ và refactor các phần sau:

- Next.js/Vercel route architecture và `public/manus-routes.json`;
- Supabase server/browser client và private Storage upload;
- Zalo OAuth PKCE, token encryption, refresh-token rotation;
- Zalo client cho ZBS templates, upload file, gửi file và mã lỗi;
- transaction/event/audit pattern;
- idempotency key, part status, message ID và retry endpoint;
- webhook signature verification và reconcile boundary;
- migration workflow và tài liệu API contract.

Cần sửa hoặc thay thế:

- Không dùng Google OAuth làm auth chính của MVP; thay bằng backend JWT email/password theo quyết định đã duyệt, nhưng giữ abstraction để có thể chuyển sang Supabase Auth/SSO sau này.
- Không coi `transactions` hiện tại là mô hình hồ sơ hành chính hoàn chỉnh; bổ sung `cases`, `case_tokens`, `case_ratings`, `case_links` hoặc migration tương đương.
- Không lưu `zalo_uid` như dữ liệu hiển thị; mã hóa hoặc băm trường dùng để đối soát, tách UID Mini App khỏi UID theo OA.
- Không gửi file và Vote template như hai nghiệp vụ độc lập vô điều kiện; tạo `CaseNotificationProvider` để phối hợp một thông báo nghiệp vụ và ghi nhận kết quả từng phần.
- Không phụ thuộc vào việc Zalo webhook rating chắc chắn có UID; đối soát bằng message ID và có reconcile job.

## 4. Mô hình module

```text
apps/
  web/                 # Next.js quản trị + API Vercel (codebase hiện tại)
  miniapp/             # Zalo Mini App React/ZMP SDK, build riêng từ cùng repo
packages/
  domain/              # Case, token, rating, consent, status transitions
  validation/          # Zod schemas dùng chung
  zalo-adapter/        # interface + OA/ZBS/mock providers
  auth/                # password hashing, JWT, role guard
  testing/             # fixtures, fake Zalo, fake storage, contract helpers
docs/
  API_CONTRACT.md
  ARCHITECTURE_SUPABASE.md
  IMPLEMENTATION_PLAN_PUBLIC_SERVICE_RATING.md
  DEPLOY_GUIDE.md
supabase/migrations/
  ...                  # migrations tăng dần, không sửa migration đã chạy
```

Nếu Vercel chỉ build một app, `apps/web` tiếp tục là root deployment hiện tại; `apps/miniapp` được build bằng script CI riêng và đóng gói để nạp vào Mini App Center. Shared packages không chứa secret và không import code server-only vào Mini App.

## 5. Dữ liệu lõi dự kiến

- `admin_users`: tài khoản quản trị, password hash, role, status, created/updated.
- `oa_accounts`: OA id/app id, token ciphertext, refresh token ciphertext, expiry, webhook secret reference, active state.
- `cases`: case code, procedure, department, officer, appointment date, PDF storage path, status, created_by.
- `case_tokens`: token hash, case id, expires_at, consumed/active state.
- `case_links`: case id, OA UID ciphertext/hash, link method (`auto|manual`), linked_by, linked_at.
- `ratings`: case id, OA UID hash, stars, comment ciphertext or protected text, consent timestamp, submitted_at; unique `(case_id, oa_uid_hash)`.
- `notification_attempts`: case id, channel/part, idempotency key, message id, status, retry count, error code/message.
- `audit_logs`: actor, action, entity, metadata, created_at.

RLS vẫn bật cho bảng nghiệp vụ. Server-only service role thực hiện nghiệp vụ nhạy cảm; client không gọi trực tiếp bằng service role.

## 6. Luồng kỹ thuật chính

### 6.1 Tạo và liên kết hồ sơ

1. Cán bộ tạo case ở trạng thái `draft`.
2. Backend tạo token ngẫu nhiên, chỉ lưu hash; token có hạn dùng và scope đúng một case.
3. Hệ thống hiển thị QR/link liên kết tạm.
4. Công dân mở Mini App, Mini App lấy identity theo SDK và thực hiện flow follow/link theo khả năng được Zalo cấp.
5. Backend xác minh token, map OA UID đã nhận được và ghi audit event.
6. Nếu tự liên kết không thành công, cán bộ nhập UID OA; backend ghi người thao tác và không cho sửa im lặng.

### 6.2 Gửi giấy hẹn và lời mời

1. Cán bộ bấm gửi với idempotency key.
2. Backend kiểm tra case, token/link, OA active, PDF tồn tại và template/config đã hợp lệ.
3. `CaseNotificationProvider` chọn adapter theo loại tin/permission đã được bật.
4. File được upload sang Zalo nếu cần, rồi gửi theo API đã xác minh.
5. Lời mời đánh giá chứa deep link Mini App với token opaque.
6. Mỗi phần ghi `message_id`, trạng thái, lỗi và event append-only.
7. Retry chỉ chạy lỗi tạm thời; lỗi quota, quyền hoặc recipient không đủ điều kiện không tự retry.

### 6.3 Gửi đánh giá

1. Mini App gửi token và payload stars/comment/consent.
2. Backend xác minh token, identity, case active và điều kiện chưa rated.
3. Zod validation giới hạn stars 1–5, comment 1.000 ký tự.
4. Nếu comment khác rỗng thì consent bắt buộc.
5. Transaction database ghi rating nguyên tử; unique constraint chặn double submit.
6. Mini App nhận success state và không hiển thị dữ liệu cá nhân dư thừa.

## 7. Thiết kế UX/UI

**Design movement:** Civic calm / digital public service — cảm giác tin cậy, rõ ràng, không thương mại hóa trải nghiệm hành chính.

**Nguyên tắc:** tối giản thao tác, ưu tiên khả năng đọc trên điện thoại, trạng thái luôn rõ, không tạo áp lực khi đánh giá, và bảo vệ dữ liệu ngay trong giao diện.

**Màu sắc:** dùng màu thương hiệu cơ quan làm màu nhận diện chính; nền trung tính sáng; màu cảnh báo chỉ dùng cho lỗi thật. Không dùng gradient hoặc hiệu ứng bán hàng.

**Bố cục:** một cột mobile-first, card thông tin hồ sơ ở đầu, một hành động chính mỗi bước, khoảng thở lớn, nút chạm tối thiểu 44px.

**Điểm nhấn:** card hồ sơ có đường viền nhận diện, trạng thái gửi/đánh giá bằng badge dễ đọc, animation nhẹ khi chọn sao và màn hình hoàn tất có xác nhận rõ ràng.

**Typography:** font hệ thống, tiêu đề rõ và ngắn; body tối thiểu 16px trên Mini App; tương phản đạt WCAG AA.

**Giọng điệu:** lịch sự, trực tiếp, không đổ lỗi cho công dân. Ví dụ: “Vui lòng kiểm tra thông tin hồ sơ trước khi đánh giá.” và “Ý kiến của Anh/Chị đã được ghi nhận.”

## 8. Kế hoạch chuyển đổi theo pha

### Pha 1 — baseline và contract

Đóng băng API contract, tạo domain types, xác định migration strategy, thêm mock Zalo provider và test fixtures. Không deploy production migration trong pha này.

### Pha 2 — hồ sơ và auth

Thêm admin JWT, case CRUD tối thiểu, token/link flow, PDF metadata và Storage policies. Giữ route cũ hoạt động trong thời gian chuyển tiếp nếu không gây xung đột.

### Pha 3 — Mini App

Tạo package Mini App, các màn hình link/confirm/rating/success, SDK abstraction, API client và fallback error states. Build được ngoài môi trường Zalo bằng mock SDK.

### Pha 4 — notification integration

Refactor Zalo client thành provider interface; hoàn thiện gửi PDF + deep link theo API/permission thực tế; map lỗi và retry. Không đánh dấu hoàn tất nếu chưa test OA Test.

### Pha 5 — hardening và deploy

Chạy lint/typecheck/unit/integration/contract/E2E, kiểm tra migration/advisor, deploy Preview, test smoke, sau đó mới promote Production. Bổ sung runbook rollback và hướng dẫn người không chuyên.

## 9. Ràng buộc phải theo dõi

- Vercel/GitHub/Supabase production đều dùng tài nguyên riêng của `danh-gia-dich-vu-cong`.
- `oavote` đã được pause vì là project legacy; không trỏ env production hoặc migration mới vào đó.
- Tài liệu API hiện hành ghi file Zalo có thời hạn tối đa 7 ngày và quota riêng; giao diện phải nói rõ giới hạn nếu người dùng xem lại giấy hẹn.
- Cơ chế `idByOA`, quyền Message Template/webhook rating và loại tin chứa đồng thời PDF + deep link phải kiểm chứng trên App/OA thật.
- Không đưa secret vào GitHub, Mini App bundle hoặc logs.
