# Hệ thống Đánh giá Dịch vụ công qua Zalo

> Tài liệu mô tả chung sản phẩm – dành cho Trung tâm Phục vụ Hành chính công (HCC)

---

## 1. Tổng quan

### 1.1 Mục tiêu sản phẩm

Xây dựng kênh thu thập đánh giá mức độ hài lòng của công dân sau khi giải quyết thủ tục hành chính, ngay trên Zalo – nền tảng người dân sử dụng hằng ngày.

Công dân chỉ cần **bấm một nút trong tin nhắn Zalo OA → chạm số sao → gửi**, không phải nhập mã hồ sơ, không phải đăng nhập. Toàn bộ thao tác hoàn tất trong dưới 10 giây.

### 1.2 Nguyên tắc thiết kế cốt lõi

Giá trị của sản phẩm nằm ở **luồng nghiệp vụ tổng thể**, không chỉ ở Mini App:

- Mini App **không tự tìm hồ sơ**; hồ sơ được xác định sẵn từ lúc cán bộ gửi giấy hẹn.
- Mỗi lượt đánh giá gắn với **một hồ sơ cụ thể** và **một tài khoản Zalo cụ thể**.
- Đánh giá không chỉ có số sao mà còn có **lý do chi tiết**, giúp báo cáo có giá trị quản trị.

### 1.3 Đối tượng sử dụng

| Đối tượng | Vai trò |
|---|---|
| Công dân / tổ chức | Nhận giấy hẹn qua Zalo OA, đánh giá chất lượng phục vụ |
| Cán bộ một cửa | Tải giấy hẹn PDF, kích hoạt gửi tin và mời đánh giá |
| Lãnh đạo / quản trị | Xem dashboard, báo cáo mức độ hài lòng, phục vụ cải cách hành chính |

---

## 2. Luồng nghiệp vụ tổng thể

```
Cán bộ
   │  Upload giấy hẹn PDF
   ▼
Hệ thống Đánh giá DVHC
   ├──> Lưu hồ sơ
   └──> Gửi qua Zalo OA
            ├──> PDF giấy hẹn
            └──> Nút "Đánh giá dịch vụ"
                        ▼
                  Zalo Mini App
                        ├──> Chấm sao
                        ├──> Gửi góp ý
                        └──> Dữ liệu về Dashboard quản trị
```

**Các bước chi tiết**

1. Cán bộ tải PDF giấy hẹn lên hệ thống và bấm **"Gửi giấy hẹn"**.
2. Hệ thống lưu hồ sơ và tạo **token duy nhất** gắn với hồ sơ.
3. Backend gọi Zalo OA API gửi tin nhắn: *"Giấy hẹn trả kết quả đã được phát hành. Vui lòng đánh giá chất lượng phục vụ."* kèm PDF và nút **Đánh giá dịch vụ**.
4. Công dân bấm nút → OA mở Mini App kèm tham số `case_id` (và token).
5. Mini App đọc tham số, gọi API lấy thông tin hồ sơ, hiển thị đúng hồ sơ cần đánh giá.
6. Công dân chấm sao, chọn lý do, góp ý (nếu có) và gửi.
7. Hệ thống ghi nhận, hiển thị màn hình cảm ơn; dữ liệu cập nhật lên dashboard.

---

## 3. Kiến trúc hệ thống

```
Zalo OA
   │  Nút "Đánh giá dịch vụ"
   ▼
Zalo Mini App (React)
   │
   ▼
API Backend (Node.js)
   ├──> Supabase (PostgreSQL)
   └──> Dashboard quản trị
```

| Thành phần | Công nghệ / Mô tả |
|---|---|
| Zalo OA | Kênh gửi giấy hẹn và nút mời đánh giá (đã có sẵn) |
| Zalo Mini App | React, Zalo Mini App SDK (`zmp-sdk`), CLI `zmp-cli` |
| API Backend | Node.js, cung cấp API hồ sơ, đánh giá, gọi OA API |
| Cơ sở dữ liệu | Supabase (PostgreSQL) |
| Dashboard quản trị | Web app cho lãnh đạo / quản trị viên |

---

## 4. Chuẩn bị hệ sinh thái Zalo

Cần tạo 3 thành phần:

1. **Zalo OA** – đã có, ví dụ: *Trung tâm Phục vụ HCC tỉnh X*.
2. **App trên Zalo for Developers** – loại *Doanh nghiệp*; sau khi tạo nhận `APP ID` và `APP SECRET`. Mini App sẽ dùng App này.
3. **Zalo Mini App** – tạo tại Mini App Center:
   - Tên: *Đánh Giá Dịch Vụ Công*
   - Slug: `danh-gia-dich-vu-cong`
   - Loại: Government

> Lưu ý: nên đối chiếu quy trình đăng ký, loại ứng dụng và API OA với tài liệu Zalo hiện hành trước khi triển khai, vì nền tảng có thể thay đổi.

---

## 5. Chức năng Mini App

Mini App gồm **4 màn hình**.

### Màn hình 1 – Chào và xác nhận hồ sơ

```
ĐÁNH GIÁ DỊCH VỤ CÔNG
Trung tâm Phục vụ HCC

Mã hồ sơ:  HS-2026-001234
Người nộp: Nguyễn Văn A
Thủ tục:   Cấp bản sao khai sinh

[ Bắt đầu đánh giá ]
```

Mục tiêu: hiển thị đúng hồ sơ để công dân biết mình đang đánh giá hồ sơ nào.

### Màn hình 2 – Chấm sao

```
Anh/Chị hài lòng với chất lượng phục vụ?
★ ★ ★ ★ ☆
```

Công dân chạm vào số sao từ 1 đến 5.

### Màn hình 3 – Đánh giá chi tiết (rẽ nhánh theo số sao)

**Nếu 1–3 sao** – *Điều gì chưa hài lòng?*

- ☐ Thời gian xử lý
- ☐ Hướng dẫn chưa rõ
- ☐ Thái độ phục vụ
- ☐ Khác

**Nếu 4–5 sao** – *Anh/Chị hài lòng nhất về?*

- ☐ Nhanh chóng
- ☐ Thân thiện
- ☐ Minh bạch
- ☐ Hỗ trợ tốt

Cả hai nhánh đều có ô **Ý kiến góp ý** (văn bản tự do). Cách này giúp báo cáo có giá trị hơn nhiều so với chỉ thu số sao.

### Màn hình 4 – Hoàn tất

```
✓ Cảm ơn Anh/Chị
Ý kiến đã được ghi nhận.
★★★★★
[ Đóng ]
```

---

## 6. Truyền dữ liệu từ OA sang Mini App

Đây là phần quan trọng nhất của giải pháp.

**Dữ liệu OA gửi kèm nút:**

```json
{
  "case_id": "HS001234",
  "token": "abcxyz"
}
```

**Cấu hình nút trong tin nhắn OA:**

```json
{
  "title": "Đánh giá dịch vụ",
  "type": "oa.open.miniapp",
  "miniapp_id": "YOUR_MINIAPP_ID",
  "params": "case_id=HS001234"
}
```

**Mini App xử lý:**

1. Mở với đường dẫn dạng `?case_id=HS001234`.
2. Đọc tham số `case_id`.
3. Gọi `GET /api/case/HS001234` để lấy thông tin hồ sơ.

**Gửi tin từ OA khi cán bộ phát hành giấy hẹn:**

```json
{
  "recipient": { "user_id": "123456789" },
  "message": {
    "text": "Giấy hẹn trả kết quả đã được phát hành.\nVui lòng đánh giá chất lượng phục vụ."
  }
}
```

---

## 7. Định danh công dân (Zalo UID)

Mini App lấy thông tin người dùng qua SDK của Zalo:

```javascript
import { getUserInfo } from "zmp-sdk/apis";

const user = await getUserInfo();
console.log(user.userInfo.id); // ví dụ: "123456789"
```

UID Zalo được dùng để:

- Chống đánh giá trùng.
- Đối chiếu với hồ sơ.
- Phục vụ thống kê.

Mỗi lượt đánh giá lưu: `zalo_uid`, `case_id`, `stars`, `comment` (và lý do chọn).

---

## 8. Mô hình dữ liệu (Supabase)

### Bảng `cases` – Hồ sơ

```sql
create table public.cases (
    id uuid primary key default gen_random_uuid(),
    case_code text not null,
    citizen_name text,
    procedure_name text,
    zalo_uid text,
    created_at timestamp default now()
);
```

### Bảng `ratings` – Đánh giá

```sql
create table public.ratings (
    id uuid primary key default gen_random_uuid(),
    case_id uuid references cases(id),
    stars integer,
    comment text,
    zalo_uid text,
    created_at timestamp default now()
);
```

### Gợi ý mở rộng

| Nhu cầu | Bổ sung đề xuất |
|---|---|
| Mở đúng hồ sơ, không đoán mã | Trường `token` (duy nhất, có hạn dùng) và `token_expires_at` trong `cases` |
| Đánh giá chi tiết | Trường `reasons` (mảng/JSON) trong `ratings` |
| Thống kê theo phòng ban, cán bộ | Trường `department`, `officer_name` trong `cases` |
| Chống trùng | Ràng buộc duy nhất trên (`case_id`, `zalo_uid`) |

---

## 9. API Backend

### Lấy thông tin hồ sơ

```
GET /api/case/:id
```

```json
{
  "id": "123",
  "case_code": "HS-2026-000123",
  "procedure_name": "Cấp bản sao hộ tịch"
}
```

### Gửi đánh giá

```
POST /api/rating
```

```json
{
  "case_id": "123",
  "stars": 5,
  "comment": "Cán bộ hỗ trợ rất tốt",
  "zalo_uid": "123456789"
}
```

---

## 10. Dashboard quản trị

**Biểu đồ và chỉ số chính**

- **Theo số sao** – tỷ lệ 1 đến 5 sao (ví dụ: 5★ 82%, 4★ 12%, 3★ 4%, 2★ 1%, 1★ 1%).
- **Theo phòng ban** – Tư pháp, Đất đai, Xây dựng, Thuế, …
- **Theo cán bộ** – so sánh mức độ hài lòng từng cán bộ.
- **Theo lý do** – nhóm nguyên nhân chưa hài lòng / điểm hài lòng nhất.

**Tiện ích đi kèm**

- Xuất báo cáo Excel.
- Phân quyền theo vai trò (lãnh đạo, quản trị, cán bộ).
- Báo cáo chỉ số hài lòng theo quy định hành chính công.

---

## 11. Bảo mật và chất lượng dữ liệu (khuyến nghị)

- Token gắn hồ sơ phải **ngẫu nhiên, duy nhất, có thời hạn**, và chỉ dùng cho đúng một hồ sơ.
- Backend phải kiểm tra token / `zalo_uid` trước khi nhận đánh giá; không tin dữ liệu từ client.
- Chặn đánh giá trùng theo cặp hồ sơ – tài khoản Zalo.
- Giữ `APP SECRET` và khóa Supabase ở phía backend, không đưa vào Mini App.
- Tuân thủ quy định về bảo vệ dữ liệu cá nhân khi lưu thông tin công dân.

---

## 12. Lộ trình triển khai

| Giai đoạn | Thời gian | Nội dung |
|---|---|---|
| **1 – MVP** | 5–7 ngày | Supabase, Backend Node.js, Mini App, gửi đánh giá |
| **2 – Quản trị** | 7–10 ngày | Dashboard, báo cáo Excel, phân quyền cán bộ |
| **3 – Tích hợp** | Theo đối tượng | Kết nối hệ thống Một cửa (VNPT iGate, Viettel iGate, eGov, …); tự động gửi giấy hẹn khi hồ sơ đổi trạng thái; báo cáo chỉ số hài lòng theo quy định |

---

## 13. Hướng dẫn khởi tạo dự án Mini App

```bash
npm install -g zmp-cli
npx create-zalo-mini-app dg-dichvucong   # hoặc: zmp init
zmp start                                 # chạy local
```

**Cấu trúc thư mục đề xuất**

```
dg-dichvucong/
└── src/
    ├── pages/
    │   ├── home/        # Chào, xác nhận hồ sơ
    │   ├── rating/      # Chấm sao, chi tiết
    │   └── success/     # Hoàn tất
    ├── components/      # StarRating, ...
    ├── services/        # Gọi API
    ├── api/
    └── utils/
```

**Component chấm sao (rút gọn)**

```jsx
import { useState } from "react";

export default function StarRating({ onChange }) {
  const [rating, setRating] = useState(0);

  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ fontSize: "40px", cursor: "pointer" }}
          onClick={() => { setRating(star); onChange(star); }}
        >
          {star <= rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}
```

---

## 14. Giá trị mang lại

- **Với công dân:** không nhập mã hồ sơ, không đăng nhập, đánh giá trong dưới 10 giây.
- **Với cơ quan:** tỷ lệ phản hồi cao hơn đáng kể so với khảo sát qua link web thông thường; dữ liệu gắn đúng hồ sơ, đúng người.
- **Với lãnh đạo:** báo cáo theo sao, phòng ban, cán bộ và lý do, phục vụ trực tiếp công tác cải cách hành chính.
