# Ghi chú nghiên cứu Zalo cho dự án Đánh giá Dịch vụ Công

Cập nhật: 2026-10-02

## Kết luận đã kiểm chứng

1. Quy trình chính thức của Mini App gồm: tạo Zalo App, tạo Mini App trong Zalo App, xây dựng, xin quyền, xác thực Mini App, phát hành và thiết lập gửi thông báo. Mini App được quản lý tại Mini App Center; một Zalo App có thể chứa nhiều Mini App.
   - https://miniapp.zaloplatforms.com/documents/intro/getting-started/

2. Mini App có thể mở từ nhiều entry point, trong đó có menu tùy chỉnh của Zalo OA. Link ngoài nền tảng có dạng `https://zalo.me/s/{mini-appId}/?variable=value`, cho phép truyền parameters. Cần xác nhận riêng cơ chế nút rich message OA sẽ dùng trong phiên bản API hiện hành.
   - https://miniapp.zaloplatforms.com/documents/intro/entry-point-access/

3. SDK hiện hành được tài liệu hóa qua `zmp-sdk`; nhóm User Information gồm `getUserID`, `getUserInfo`, `getAccessToken`, `getPhoneNumber`. Không nên mặc định dùng tên/avatar để định danh. Quyền số điện thoại cần sự đồng ý; quyền phải xin đúng ngữ cảnh và có thể phải được Zalo duyệt tùy API.
   - https://miniapp.zaloplatforms.com/documents/api/
   - https://docs.zaloplatforms.com/docs/MA/intro/request-permission

4. OA OpenAPI yêu cầu doanh nghiệp có Zalo OA và Zalo App; hệ thống backend tích hợp qua quyền API và webhook. Zalo mô tả OA OpenAPI là công cụ vận hành tự động, tập trung dữ liệu và kết nối hệ thống nội bộ.
   - https://oa.zalo.me/home/documents/vie/guides/Khoi-tao-ung-dung-va-cap-quyen_117071366476220195

5. OA Test là phương án kiểm thử trước production nhưng cần có ít nhất một OA doanh nghiệp đã xác thực; OA Test tối đa 100 người quan tâm, không hiển thị tìm kiếm và chỉ phục vụ kiểm thử tích hợp.
   - https://oa.zalo.me/home/documents/vie/guides/tao-tai-khoan-oa-thu-nghiem-ky-thuat_4023591696049457534

6. Tin UID của OA cần UID theo đúng OA; tài liệu Mini App hiện mô tả `getUserInfo()` có thể trả `id` (theo Mini App) và `idByOA` (theo OA) khi người dùng đã quan tâm OA. Vì vậy UID Mini App và UID OA không nên coi là cùng một giá trị.
   - https://mini.zalo.me/docs/open-apis/notifications/send/

7. Gửi thông báo qua OA có nhiều loại và điều kiện. Tin Tư vấn qua OA OpenAPI yêu cầu người dùng có tương tác với OA; tài liệu tổng quan hiện ghi OA OpenAPI có thể gửi trong vòng 07 ngày từ tương tác cuối, còn Tin Tư vấn trong 48 giờ là miễn phí. ZBS Template Message có Tin Giao dịch và Tin Hậu mãi, gửi qua UID hoặc số điện thoại theo điều kiện/template được duyệt.
   - https://oa.zalo.me/home/documents/vie/guides/tong-quan-cac-loai-tin-nhan-tren-zalo-official-account-_3651713298729094511

8. Tài liệu Mini App cập nhật 11/09/2026 ghi quyền lợi gửi thông báo qua OA đang có điều kiện thử nghiệm; đối tác phải đạt điều kiện kiểm duyệt, hiệu suất và xác thực bởi OA. Tài liệu cũng ghi dịch vụ tin mUID đã ngừng hỗ trợ từ 28/02/2026. Không được thiết kế MVP dựa trên mUID hoặc giả định mọi UID đều gửi được tin tự do.
   - https://miniapp.zaloplatforms.com/documents/pages/tin-mini-app/send-message-oa-to-user/

9. Chính sách OA yêu cầu gửi đúng mục đích, đúng người nhận, đúng ngữ cảnh và không gây phiền; tin truyền thông có hạn mức theo chính sách từng thời kỳ. Nội dung giấy hẹn và lời mời đánh giá cần được phân loại đúng loại tin sau khi xác định người nhận đã tương tác/follow OA hay có thể dùng ZBS Template/ZNS.
   - https://oa.zalo.me/home/documents/vie/policy/tuong-tac-cua-oa-voi-nguoi-dung

## Tác động đến thiết kế dự án

- Do yêu cầu triển khai chỉ trên GitHub–Vercel–Supabase, backend nên thiết kế dưới dạng Vercel Functions/Route Handlers hoặc API serverless tương thích Vercel; không dùng Railway/Render như bản đặc tả cũ.
- `APP_SECRET`, OA token/refresh token, Supabase service role key chỉ ở Vercel server-side environment variables. Mini App chỉ nhận token opaque ngắn hạn hoặc liên kết đã ký; backend phải kiểm tra token, trạng thái hồ sơ, thời hạn và chống đánh giá trùng.
- Cần tách lớp `MiniAppIdentity` (UID theo App/Mini App) và `OAIdentity` (`idByOA` nếu có). Luồng MVP không nên bắt buộc số điện thoại.
- Cần thiết kế `ZaloMessagingProvider` có adapter cho OA OpenAPI và khả năng mở rộng ZBS Template/ZNS; không hard-code một loại tin trước khi chốt điều kiện OA thực tế.
- Kiểm thử trước release phải có mock contract cho Zalo SDK, OA API, webhook, Supabase và test tích hợp trên OA Test nếu tài khoản/điều kiện được cấp. Sau deploy cần kiểm tra health, callback/webhook, luồng mở Mini App với parameter, gửi đánh giá, chống trùng và dashboard.
