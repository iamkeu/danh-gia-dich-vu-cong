# Baseline quyết định đã xác nhận — Đánh giá Dịch vụ Công

Cập nhật: 2026-10-02

## Phạm vi và luồng MVP

Hệ thống dùng Mini App + backend Vercel + Supabase, với mã nguồn trên GitHub. Cán bộ tạo hồ sơ/tải PDF giấy hẹn và bấm một lần để gửi một tin OA gồm PDF cùng nút đánh giá. Công dân được đánh giá ngay sau khi giấy hẹn được gửi. Mỗi hồ sơ chỉ có một lượt đánh giá.

MVP nhập/tải hồ sơ thủ công nhưng phải có adapter để sau này kết nối hệ thống Một cửa. Giai đoạn đầu dưới 1.000 hồ sơ/tháng, dưới 100 người dùng quản trị và tải thấp.

## Zalo và định danh

Chỉ gửi qua OA cho công dân đã quan tâm OA và hệ thống có UID theo OA (`idByOA`) trước khi gửi. Nếu hồ sơ chưa có UID, ưu tiên công dân quét QR/link tại quầy để tự liên kết; cho phép cán bộ nhập UID theo OA làm phương án dự phòng và bắt buộc ghi audit log.

Hiện mới có OA; chưa có Zalo App và Mini App. Phía cơ quan tự xử lý hồ sơ xác thực/phát hành Zalo. Hệ thống phải dùng OA Test/Mini App test cho kiểm thử tích hợp trước release. Giai đoạn test dùng domain mặc định `*.vercel.app` cho frontend, API callback và webhook.

## Dữ liệu và quyền riêng tư

MVP lưu tối thiểu dữ liệu cần thiết: mã hồ sơ, thủ tục, phòng ban, cán bộ, ngày hẹn, token, trạng thái gửi, UID theo OA được bảo vệ, PDF và đánh giá. Không cần số điện thoại; Mini App không hiển thị họ tên đầy đủ. Chưa tự động xóa dữ liệu; phải có cấu hình retention theo loại dữ liệu và trạng thái chờ phê duyệt.

Công dân chấm sao và có thể nhập góp ý tự do; MVP không dùng nhóm lý do. Khi nhập góp ý tự do, cần checkbox đồng ý sử dụng phản hồi cho mục đích cải thiện chất lượng dịch vụ và liên kết chính sách riêng tư. Góp ý tối đa 1.000 ký tự.

## Quản trị và nội dung

MVP có ba vai trò: Quản trị viên, Lãnh đạo và Cán bộ. Quản trị viên toàn quyền; Lãnh đạo xem toàn đơn vị; Cán bộ tạo/gửi và xem hồ sơ do mình phụ trách. Dashboard/báo cáo chưa triển khai trong MVP nhưng schema và quyền phải chừa sẵn.

Đăng nhập quản trị dùng email/password và JWT do backend quản lý, không dùng Supabase Auth. MVP chỉ tiếng Việt. Quản trị viên được chỉnh sửa mẫu tin OA và nhãn giao diện qua cấu hình, có nhật ký/phiên bản thay đổi.

Giao diện dùng đầy đủ nhận diện chính thức của cơ quan: tên, logo, màu thương hiệu, tên Trung tâm/đơn vị; UI đơn giản, thẩm mỹ, responsive và mobile-first.

## Gửi OA và xử lý lỗi

Gửi tin phải lưu trạng thái, message ID, thời gian và lịch sử lỗi. Lỗi tạm thời tự retry có backoff; lỗi quyền/dữ liệu dừng để xử lý; luôn có idempotency để gửi lại không tạo tin trùng.

## Kiểm thử và nghiệm thu

Trước release: mock toàn bộ Zalo SDK/OA API/webhook, unit/integration/contract/E2E và kiểm tra build/lint/type. Đồng thời dùng OA Test/Mini App test để kiểm thử liên kết UID, tạo hồ sơ, upload PDF, gửi tin, mở Mini App, gửi đánh giá, chống trùng và retry.

MVP đạt khi toàn bộ test trên đạt, deploy GitHub–Vercel–Supabase thành công và kiểm thử tích hợp OA Test/Mini App test thành công. Chưa yêu cầu pilot người dùng thật ở tiêu chí MVP.

## Các điểm còn phụ thuộc/chưa thể tự quyết

1. Cách thức kỹ thuật chính xác để nhận `idByOA` trong luồng liên kết tại quầy cần kiểm chứng lại trên App/Mini App/OA thực tế sau khi tạo tài khoản và xin quyền.
2. Loại tin OA phù hợp cho một tin vừa có PDF vừa có nút mở Mini App phải chốt theo quyền và API Zalo tại thời điểm tích hợp; không hard-code giả định cũ trong tài liệu.
3. Tên, logo, màu thương hiệu, URL repo/project hiện hữu, tên Vercel project, Supabase project và người quản trị cần được cung cấp/xác minh qua connector trước deploy.
4. Quy định retention chính thức và nội dung chính sách riêng tư cần cơ quan phê duyệt.
5. Hồ sơ pháp lý/xác thực Mini App và OA Test do cơ quan tự thực hiện.
