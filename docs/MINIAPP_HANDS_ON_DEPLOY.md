# Hướng dẫn cầm tay chỉ việc: deploy Mini App `danh-gia-dvc`

Tài liệu này dành cho người không chuyên kỹ thuật. Bạn chỉ cần làm lần lượt từng bước, không bỏ qua bước kiểm tra.

## 0. Kết quả cần đạt

Sau khi hoàn tất, bạn sẽ:

1. Có source Mini App trên máy tính.
2. Liên kết source với Mini App `danh-gia-dvc` đã tạo trên Zalo.
3. Chạy được trên trình duyệt.
4. Chạy được trên ứng dụng Zalo thật bằng QR.
5. Deploy được bản `Testing` lên Zalo Mini App.
6. Kiểm thử luồng:

```text
Zalo OA → Mini App → getUserID/getUserInfo → giấy hẹn → PDF → đánh giá 1–5 sao → góp ý/consent → Backend Vercel → Supabase
```

> Bạn **không cần sửa logic source hiện có**. Bước `zmp init` chỉ bổ sung file cấu hình Zalo cần thiết vào thư mục Mini App; không thay đổi nghiệp vụ giấy hẹn/đánh giá.

---

## 1. Chuẩn bị trước khi bắt đầu

### 1.1. Máy tính

Cần dùng máy Windows, macOS hoặc Linux có kết nối Internet.

Bạn cần cài:

- Google Chrome.
- Node.js bản LTS, phiên bản từ 18 trở lên.
- Ứng dụng Zalo trên điện thoại.
- Tài khoản Zalo Developer có quyền trên Mini App `danh-gia-dvc`.

### 1.2. Kiểm tra Node.js

Mở **Command Prompt** trên Windows hoặc **Terminal** trên macOS/Linux.

Gõ từng lệnh sau, mỗi lệnh xong nhấn Enter:

```bash
node --version
npm --version
```

Nếu thấy số phiên bản, ví dụ `v20.x.x` và `10.x.x`, là đạt.

Nếu báo `'node' is not recognized` hoặc `command not found`, hãy cài Node.js LTS tại:

https://nodejs.org/

Sau khi cài xong, đóng và mở lại Command Prompt/Terminal rồi kiểm tra lại.

### 1.3. Lấy đúng Mini App ID

Trong Zalo Mini App Developers, mở Mini App có tên:

```text
danh-gia-dvc
```

Tìm trường có tên tương tự:

```text
Mini App ID / App ID / ID ứng dụng
```

Sao chép ID này vào một file tạm. Chỉ cần ID, **không cần App Secret**.

> Không gửi App Secret vào chat, không đưa App Secret vào source Mini App và không lưu App Secret trong GitHub.

---

## 2. Lấy source Mini App từ GitHub

Source Mini App nằm trong thư mục `miniapp` của repository:

```text
https://github.com/iamkeu/danh-gia-dich-vu-cong
```

Có hai cách. Chọn **một cách duy nhất**.

### Cách A — Dễ nhất: tải ZIP bằng trình duyệt

1. Mở repository GitHub.
2. Chọn đúng branch:

```text
feature/public-service-rating-foundation
```

3. Bấm nút **Code**.
4. Chọn **Download ZIP**.
5. Giải nén file ZIP.
6. Mở thư mục đã giải nén.
7. Đi vào thư mục:

```text
miniapp
```

8. Chép riêng thư mục `miniapp` ra Desktop hoặc Documents.
9. Đổi tên thư mục thành:

```text
danh-gia-dvc-miniapp
```

Sau bước này, bên trong thư mục phải có các file/thư mục sau:

```text
app-config.json
index.html
package.json
src
vite.config.ts
```

### Cách B — Dùng lệnh Git

Nếu máy đã cài Git, mở Terminal/Command Prompt và chạy:

```bash
git clone --branch feature/public-service-rating-foundation https://github.com/iamkeu/danh-gia-dich-vu-cong.git
cd danh-gia-dich-vu-cong/miniapp
```

Nếu repository yêu cầu đăng nhập, hãy đăng nhập GitHub theo hướng dẫn hiện trên màn hình. Không nhập token GitHub vào source code.

---

## 3. Cài thư viện cho Mini App

Mở Terminal/Command Prompt tại đúng thư mục `danh-gia-dvc-miniapp`.

### Cách mở Terminal đúng thư mục trên Windows

1. Mở thư mục `danh-gia-dvc-miniapp` bằng File Explorer.
2. Bấm vào thanh địa chỉ ở trên cùng.
3. Gõ `cmd`.
4. Nhấn Enter.

Cửa sổ Command Prompt sẽ mở đúng thư mục.

### Chạy lệnh cài đặt

```bash
npm install
```

Chờ đến khi lệnh hoàn tất. Có thể mất vài phút.

Nếu cuối cùng thấy dòng tương tự `added ... packages` là đạt.

---

## 4. Cài Zalo Mini App CLI

Trong cùng cửa sổ Terminal/Command Prompt, chạy:

```bash
npm install -g zmp-cli
```

Kiểm tra CLI:

```bash
zmp --version
```

Nếu thấy số phiên bản là đạt.

Nếu Windows báo lỗi quyền, hãy đóng cửa sổ hiện tại, mở **Command Prompt → Run as administrator**, rồi chạy lại lệnh trên.

---

## 5. Đăng nhập Zalo Developer CLI

Chạy:

```bash
zmp login
```

Thực hiện theo hướng dẫn trên màn hình:

1. CLI hiển thị QR hoặc mở trang đăng nhập.
2. Mở ứng dụng Zalo trên điện thoại.
3. Quét QR nếu được yêu cầu.
4. Bấm xác nhận đăng nhập.
5. Quay lại Terminal.

Nếu CLI báo đăng nhập thành công, tiếp tục bước 6.

Nếu đăng nhập sai tài khoản, chạy lại:

```bash
zmp login
```

và chọn đúng tài khoản có quyền quản lý Mini App `danh-gia-dvc`.

---

## 6. Liên kết source với Mini App `danh-gia-dvc`

Đây là bước bắt buộc trước khi deploy.

Đảm bảo Terminal đang đứng tại thư mục `danh-gia-dvc-miniapp`, sau đó chạy:

```bash
zmp init
```

Khi CLI hỏi lựa chọn, chọn như sau:

### Câu hỏi 1: loại project

Chọn:

```text
Use ZMP to deploy only
```

Không chọn `Create a new ZMP project`, vì source giao diện đã có sẵn.

### Câu hỏi 2: Mini App ID

Nhập **Mini App ID thật** của Mini App `danh-gia-dvc`.

Không nhập tên hiển thị nếu CLI yêu cầu ID.

### Câu hỏi 3: tên ứng dụng

Nếu CLI hỏi tên, nhập:

```text
Đánh giá Dịch vụ Công
```

### Sau khi `zmp init` hoàn tất

Theo tài liệu Zalo hiện hành, với lựa chọn **Use ZMP to deploy only**, CLI có thể chỉ tạo/cập nhật:

```text
.env
app-config.json
```

Vì vậy **không thấy `zmp-cli.json` là bình thường** và không phải lỗi. Không tự tạo `zmp-cli.json`.

Không xóa `.env` hoặc `app-config.json` do CLI tạo. `app-config.json` phải khai báo các asset sau build; source hiện tại đã cấu hình tên ổn định `assets/index.css` và `assets/index.js`.

> Với project deploy-only, dùng `npm run dev`/`npm run preview` để xem local và dùng `zmp deploy` để upload. Không dùng `zmp start` nếu CLI báo `This is not ZMP project`.

---

## 7. Kiểm tra source trước khi chạy

Chạy lần lượt:

```bash
npm run typecheck
npm run build
```

Kết quả đạt khi:

- Không có dòng `error`.
- Lệnh kết thúc thành công.
- Có thư mục `dist` được tạo ra.

Nếu terminal hỏi có muốn tiếp tục cài package, chọn `Y` hoặc `Yes`.

Nếu gặp lỗi ở bước này, không chạy deploy. Sao chép toàn bộ phần lỗi màu đỏ để xử lý trước.

---

## 8. Chạy thử bằng trình duyệt máy tính

Với project deploy-only, chạy bằng Vite:

```bash
npm run dev
```

CLI sẽ hiển thị địa chỉ local, thường là:

```text
http://localhost:5173
```

Mở địa chỉ đó bằng Chrome.

### Lưu ý về token

Mini App cần token hồ sơ để tải giấy hẹn. Nếu mở URL không có token, app sẽ hiện thông báo liên kết không hợp lệ. Đây là hành vi đúng.

Để test đầy đủ, cần tạo một hồ sơ test trên hệ thống quản trị:

1. Mở:

```text
https://danh-gia-dich-vu-cong.vercel.app/login
```

2. Đăng nhập tài khoản admin đã được cấp.
3. Mở khu vực quản lý hồ sơ.
4. Tạo một hồ sơ test, ví dụ:

```text
Mã hồ sơ: TEST-20261012-01
Tên thủ tục: Cấp bản sao giấy tờ hộ tịch
Đơn vị: Bộ phận tiếp nhận hồ sơ
Ngày hẹn: chọn ngày sắp tới
```

5. Tải lên một file PDF test, không chứa dữ liệu công dân thật.
6. Thực hiện liên kết hồ sơ với tài khoản Zalo test theo luồng trên màn hình.
7. Lấy link Mini App/token được hệ thống tạo.
8. Dán link đó vào Chrome local hoặc mở link web fallback để kiểm tra API.

Không dùng token của công dân thật để test trên máy tính hoặc đưa vào tài liệu.

---

## 9. Chạy thử trên điện thoại Zalo thật

Đây là bước quan trọng nhất để kiểm tra SDK `getUserID()` và `idByOA`.

### 9.1. Chuẩn bị điện thoại

Tài khoản Zalo trên điện thoại phải:

- Có thể truy cập Mini App `danh-gia-dvc`.
- Đã quan tâm/follow OA của đơn vị.
- Có quyền truy cập bản Development/Testing nếu Zalo giới hạn người dùng test.

### 9.2. Kiểm thử trên thiết bị sau khi deploy

Với project deploy-only, không chạy `zmp start -D`. Hãy deploy bản `Development` hoặc `Testing` bằng:

```bash
zmp deploy
```

Sau đó mở phiên bản trong trang quản lý Zalo Mini App hoặc dùng QR/link test mà Zalo cung cấp. Nếu muốn debug bằng local server trên điện thoại, cần dùng cách preview/dev được Zalo Studio/CLI hỗ trợ cho đúng loại project; không tự thay thế bằng `zmp start -D` khi CLI báo không phải ZMP project.

### 9.3. Quét QR

1. Mở trang quản lý Mini App `danh-gia-dvc`.
2. Mở phiên bản Development/Testing vừa deploy.
3. Thêm tài khoản Zalo test nếu Zalo yêu cầu.
4. Mở QR/link test bằng ứng dụng Zalo trên điện thoại.

### 9.4. Kiểm tra bắt buộc

Trên điện thoại, kiểm tra:

- Mini App mở được trong Zalo.
- Màn hình giấy hẹn hiển thị đúng.
- Mã hồ sơ đúng với hồ sơ test.
- PDF mở được.
- Chọn được 1–5 sao.
- Nhập góp ý được.
- Có góp ý nhưng chưa tick checkbox thì không gửi được.
- Tick checkbox thì gửi được.
- Gửi lần thứ hai bị từ chối hoặc hiển thị đã đánh giá.

Nếu không lấy được `idByOA`, không tiếp tục deploy. Kiểm tra:

1. Mini App có đúng Mini App ID không.
2. Mini App đã được liên kết/xác thực với đúng OA chưa.
3. Tài khoản test đã follow OA chưa.
4. Bạn có mở trong ứng dụng Zalo thật không, hay chỉ mở bằng Chrome.
5. Tài khoản đang dùng có quyền test Mini App không.

---

## 10. Cấu hình Backend Vercel bằng Mini App ID thật

Bước này cần làm trước khi OA gửi link Mini App chính thức.

### 10.1. Mở Vercel

1. Đăng nhập Vercel.
2. Mở project:

```text
 danh-gia-dich-vu-cong
```

3. Chọn **Settings**.
4. Chọn **Environment Variables**.

### 10.2. Thêm biến

Tạo biến:

```text
Name: ZALO_MINI_APP_ID
Value: Mini App ID thật của danh-gia-dvc
Environment: Production
```

Kiểm tra lại giá trị rồi bấm Save.

Không thêm các biến sau vào Mini App:

```text
SUPABASE_SERVICE_ROLE_KEY
ZALO_APP_SECRET
PUBLIC_SERVICE_JWT_SECRET
TOKEN_ENCRYPTION_KEY
```

Các secret này chỉ được lưu ở Backend/Vercel, không được đưa vào source Mini App.

### 10.3. Redeploy Vercel

Sau khi lưu biến:

1. Vào **Deployments**.
2. Chọn deployment Production mới nhất.
3. Chọn menu `...`.
4. Chọn **Redeploy**.
5. Xác nhận redeploy.

Sau redeploy, Backend sẽ tạo link dạng:

```text
https://zalo.me/s/{MINI_APP_ID}/?token={TOKEN}
```

Nếu vẫn thấy link:

```text
https://danh-gia-dich-vu-cong.vercel.app/miniapp?token=...
```

thì kiểm tra lại tên biến, giá trị Mini App ID và đã redeploy đúng Production chưa.

---

## 11. Deploy bản Testing lên Zalo

Không chọn Production ngay. Deploy Testing trước.

Dừng `zmp start -D` bằng:

```text
Ctrl + C
```

Chạy:

```bash
zmp deploy
```

Khi CLI hỏi trạng thái phiên bản:

- Chọn `Testing`.
- Nhập mô tả:

```text
Bản kiểm thử luồng giấy hẹn và đánh giá dịch vụ công — 12/10/2026
```

Chờ CLI upload và xử lý.

Khi thành công, vào trang quản lý Mini App trên Zalo để kiểm tra phiên bản vừa tạo.

### Vì sao chọn Testing?

- Bản Testing được lưu trong quản lý phiên bản.
- Có thể mời người kiểm thử.
- Có mã phiên bản để theo dõi.
- Không ảnh hưởng ngay đến người dùng production.

Bản Development chỉ phù hợp kiểm tra nhanh và có thể bị ghi đè bởi lần deploy tiếp theo.

---

## 12. Cho tài khoản test dùng bản Testing

Trong trang quản lý Mini App:

1. Mở phiên bản Testing vừa deploy.
2. Tìm chức năng mời/thêm người kiểm thử hoặc tạo QR/link test.
3. Thêm tài khoản Zalo trên điện thoại dùng để test.
4. Nếu Zalo yêu cầu, người test chấp nhận lời mời.
5. Mở Mini App từ QR/link phiên bản Testing.

Nếu không thấy Mini App:

- Kiểm tra đúng tài khoản Zalo.
- Kiểm tra phiên bản đã ở trạng thái Testing chưa.
- Kiểm tra tài khoản đã được thêm vào danh sách test chưa.
- Đăng xuất/đăng nhập lại Zalo nếu quyền vừa được cấp.

---

## 13. Kiểm thử nghiệp vụ đầy đủ sau deploy

Dùng một hồ sơ test riêng. Không sử dụng dữ liệu thật ở lần đầu.

### Test 1 — Mở Mini App từ link có token

Kỳ vọng:

- Mini App mở được.
- Token không bị mất.
- Hiển thị đúng hồ sơ.

### Test 2 — Nhận diện theo OA

Kỳ vọng:

- `getUserID()` chạy không lỗi.
- `getUserInfo()` chạy không lỗi.
- Có `userInfo.idByOA`.
- Hồ sơ đã liên kết đúng với người test.

Nếu `idByOA` rỗng, dừng kiểm thử và xử lý cấu hình OA/Mini App.

### Test 3 — Hiển thị giấy hẹn

Kỳ vọng:

- Mã hồ sơ đúng.
- Tên thủ tục đúng.
- Đơn vị đúng.
- Ngày hẹn đúng.
- Nút PDF hiển thị nếu hồ sơ có PDF.

### Test 4 — Mở PDF

Kỳ vọng:

- PDF mở được trong Zalo.
- Không cần đăng nhập Supabase.
- Không lộ đường dẫn storage nội bộ.

### Test 5 — Đánh giá chỉ bằng số sao

1. Chọn 5 sao.
2. Để trống góp ý.
3. Không tick checkbox.
4. Bấm Gửi đánh giá.

Kỳ vọng: gửi thành công vì góp ý trống không cần consent.

### Test 6 — Góp ý nhưng chưa đồng ý

1. Tạo hồ sơ test thứ hai.
2. Chọn 3 sao.
3. Nhập góp ý.
4. Không tick checkbox.
5. Bấm Gửi đánh giá.

Kỳ vọng: hệ thống không gửi và hiển thị yêu cầu đồng ý.

### Test 7 — Góp ý có đồng ý

1. Tick checkbox.
2. Bấm Gửi đánh giá.

Kỳ vọng:

- Gửi thành công.
- Hiển thị thông báo đã ghi nhận.
- Dữ liệu được lưu ở Supabase.

### Test 8 — Chống gửi trùng

Bấm lại gửi hoặc mở lại link đã đánh giá.

Kỳ vọng:

- Không tạo thêm đánh giá thứ hai.
- Hiển thị đã đánh giá hoặc lỗi hồ sơ đã được đánh giá.

### Test 9 — Token sai/hết hạn

Không sửa source production. Chỉ dùng URL test đã được tạo riêng.

Kỳ vọng:

- Token sai không xem được hồ sơ.
- Token hết hạn hiển thị lỗi rõ ràng.
- Không hiển thị dữ liệu của hồ sơ khác.

---

## 14. Kiểm tra dữ liệu sau test

Sau khi gửi đánh giá thành công:

1. Đăng nhập trang quản trị.
2. Mở danh sách hồ sơ.
3. Kiểm tra hồ sơ test chuyển sang trạng thái đã đánh giá hoặc trạng thái tương ứng.
4. Kiểm tra dashboard/báo cáo nếu màn hình hiện tại đã có.
5. Không chụp hoặc chia sẻ token thật, UID thật hay link PDF thật.

Nếu cần kiểm tra Supabase, chỉ người quản trị kỹ thuật nên xem database. Không chỉnh sửa trực tiếp dữ liệu production để “làm test”. Tạo hồ sơ test mới thay vì sửa hồ sơ thật.

---

## 15. Khi nào được phát hành Production?

Chỉ phát hành Production khi toàn bộ ô sau đều đạt:

- [ ] Source build không lỗi.
- [ ] Bản Development/Testing mở được trên điện thoại Zalo.
- [ ] Mini App có `idByOA`.
- [ ] Mở giấy hẹn được.
- [ ] Mở PDF được.
- [ ] Gửi 1–5 sao được.
- [ ] Góp ý không consent bị chặn.
- [ ] Góp ý có consent gửi được.
- [ ] Gửi lần hai bị chặn.
- [ ] Token sai/hết hạn bị chặn.
- [ ] Link do OA tạo là link `zalo.me/s/{MINI_APP_ID}/...`.
- [ ] Không có secret trong source Mini App.
- [ ] Phiên bản Testing đã được kiểm tra trên điện thoại thật.

Sau đó mới thực hiện:

```bash
zmp deploy
```

Chọn trạng thái phát hành theo hướng dẫn hiện trên CLI và hoàn tất quy trình xét duyệt/phát hành trong trang quản lý Zalo Mini App.

> Việc phát hành chính thức có thể yêu cầu phía cơ quan xác thực thông tin, logo, tên ứng dụng và hồ sơ pháp lý. Đây là bước trên cổng Zalo, không thể thay thế chỉ bằng lệnh Terminal.

---

## 16. Các lỗi thường gặp và cách xử lý

### Lỗi `zmp: command not found`

Chạy lại:

```bash
npm install -g zmp-cli
```

Đóng mở lại Terminal rồi chạy:

```bash
zmp --version
```

### Lỗi `npm install`

Thử:

```bash
npm cache verify
npm install
```

Không xóa `package-lock.json` và không chạy `npm audit fix --force` trong lần deploy đầu tiên.

### Lỗi `zmp init` đăng nhập sai

Chạy:

```bash
zmp login
zmp init
```

Chọn tài khoản có quyền trên `danh-gia-dvc`.

### Không thấy Mini App ID

Mở trang quản lý Mini App `danh-gia-dvc` trên Zalo Developer và tìm phần thông tin ứng dụng. Nếu chỉ thấy tên mà chưa thấy ID, hãy hoàn tất bước tạo/đăng ký Mini App trước khi chạy `zmp init`.

### `getUserInfo()` không có `idByOA`

Kiểm tra liên kết Mini App với OA, trạng thái follow và quyền test. Không sửa code để dùng tên, avatar hoặc số điện thoại thay cho `idByOA`.

### Link vẫn là web fallback

Kiểm tra Vercel:

```text
ZALO_MINI_APP_ID = Mini App ID thật
```

Sau đó redeploy Production.

### PDF không mở được

Kiểm tra:

- Hồ sơ test đã upload PDF chưa.
- PDF có phải file hợp lệ không.
- Link được mở trong Zalo thật chưa.
- Token còn hạn không.

### Bản Testing không mở được

Kiểm tra tài khoản Zalo đã được thêm vào danh sách tester và đang dùng đúng tài khoản trên điện thoại.

---

## 17. Tóm tắt lệnh phải chạy

```bash
# Vào thư mục miniapp
cd danh-gia-dvc-miniapp

# Cài dependency
npm install

# Cài CLI một lần
npm install -g zmp-cli

# Đăng nhập Zalo Developer
zmp login

# Liên kết source với Mini App đã tạo
zmp init
# Chọn: Use ZMP to deploy only
# Nhập: Mini App ID của danh-gia-dvc

# Kiểm tra source
npm run typecheck
npm run build

# Chạy local bằng Vite
npm run dev

# Hoặc kiểm tra bản production build bằng trình duyệt
npm run build
npm run preview

# Deploy bản Testing
zmp deploy
```

## 18. Nguyên tắc an toàn

- Chỉ deploy thư mục `miniapp`, không deploy toàn bộ repository Next.js bằng ZMP.
- Không đưa mật khẩu admin vào source.
- Không đưa Supabase service role key vào Mini App.
- Không đưa Zalo App Secret vào Mini App.
- Không dùng dữ liệu công dân thật để test lần đầu.
- Không chia sẻ token hồ sơ, UID OA hoặc link PDF riêng tư.
- Không chọn Production trước khi hoàn thành Testing.
