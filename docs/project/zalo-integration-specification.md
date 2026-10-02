# Zalo Integration Specification

Đặc tả tích hợp Zalo cho hệ thống **Đánh Giá Dịch Vụ Công**.

---

## 1. Mục tiêu

Hệ thống cho phép:

- Cán bộ gửi Giấy hẹn trả kết quả (PDF) tới công dân qua Zalo OA.
- Tin nhắn OA chứa nút mở Mini App.
- Mini App nhận diện đúng hồ sơ.
- Người dân đánh giá chất lượng phục vụ từ 1–5 sao.
- Kết quả được lưu về Backend và Dashboard.

Hệ thống phải tuân thủ các quy định hiện hành của Zalo Mini App Platform về quyền riêng tư, xin quyền người dùng và liên kết OA.

---

## 2. Các thành phần bắt buộc

### 2.1 Zalo Developer Account

Tài khoản tạo trên nền tảng Zalo Developers.

Mục đích:

- Quản lý App
- Quản lý Mini App
- Quản lý OA OpenAPI

Một Zalo App có thể quản lý một hoặc nhiều Mini App. ID người dùng Mini App được mã hóa theo App cha.

### 2.2 Zalo App

Ví dụ: **App Name:** Public Service Platform

Thông tin cần lưu:

- `APP_ID`
- `APP_SECRET`

`APP_ID` là định danh gốc của toàn bộ hệ sinh thái. Mini App và OA phải thuộc **cùng App**.

### 2.3 Official Account

Ví dụ: *Trung tâm Phục vụ Hành chính công*

Thông tin cần lưu:

- `OA_ID`
- `OA_NAME`
- `OA_ACCESS_TOKEN`

OA được sử dụng để:

- Gửi PDF
- Gửi tin nhắn
- Gửi lời mời đánh giá
- Nhận webhook

### 2.4 Mini App

Ví dụ: **Tên:** Đánh Giá Dịch Vụ Công

Thông tin cần lưu:

- `MINI_APP_ID`
- `APP_ID`

Mini App chạy bên trong Zalo, không cần người dùng cài đặt riêng.

---

## 3. Định danh người dùng

### 3.1 API chuẩn

```javascript
import { getUserID } from "zmp-sdk/apis";

const uid = await getUserID({});
```

API này **không yêu cầu quyền người dùng**. UID là định danh ổn định của người dùng trong phạm vi Zalo App.

### 3.2 Quy định

**KHÔNG** sử dụng làm khóa chính:

- `name`
- `phone`
- `avatar`

**BẮT BUỘC** dùng: `zalo_uid`

### 3.3 Bảng `users`

| Cột | Kiểu |
|---|---|
| id | uuid |
| zalo_uid | text, unique |
| display_name | text |
| avatar | text |
| created_at | timestamp |

---

## 4. Thông tin người dùng

### 4.1 Xin quyền

Để lấy tên và avatar:

```javascript
import { authorize } from "zmp-sdk/apis";

await authorize({
  scopes: ["scope.userInfo"]
});
```

### 4.2 Lấy dữ liệu

```javascript
import { getUserInfo } from "zmp-sdk/apis";

const result = await getUserInfo({
  autoRequestPermission: true
});
```

Ví dụ kết quả:

```json
{
  "id": "123456",
  "name": "Nguyen Van A",
  "avatar": "..."
}
```

### 4.3 Chính sách

Không được:

- Xin quyền ngay khi mở app
- Xin quyền không có lý do

Phải hiển thị giải thích trước khi gọi `authorize()`.

---

## 5. Số điện thoại

**Không sử dụng trong MVP.**

Nếu cần:

```javascript
await authorize({
  scopes: ["scope.userPhonenumber"]
});
```

Người dùng phải đồng ý riêng.

---

## 6. Kiến trúc token

### 6.1 Tuyệt đối không truyền

| Sai | Ví dụ |
|---|---|
| Mã hồ sơ | `case_id=HS001` |
| Định danh công dân | `citizen_id=123` |

### 6.2 Thiết kế đúng

Backend sinh `token`, ví dụ: `0c85c6c1-0c7e-4f9d-b88d`

Lưu trong bảng `cases` (`id`, `token`).

### 6.3 Mapping

Bảng `cases`: `id`, `case_code`, `token`, `status`.

Token **chỉ dùng để mở Mini App**.

---

## 7. Luồng mở Mini App từ OA

```
Cán bộ
   |
Upload PDF
   |
Backend
   |
Gửi OA
   |
Người dân
   |
Click Đánh giá
   |
Mini App
   |
GET Case
   |
Rating
```

**OA Message**

```json
{
  "title": "Đánh giá dịch vụ",
  "token": "xxxx"
}
```

**Mini App** đọc token:

```javascript
const token = query.token;
```

**Backend**

```
GET /api/cases/token/{token}
```

**Response**

```json
{
  "caseCode": "HS001",
  "procedureName": "Cap ban sao khai sinh"
}
```

---

## 8. Follow OA

Sau khi đánh giá thành công, hiển thị:

> Anh/Chị có muốn nhận thông báo hồ sơ qua Zalo không?

Nếu đồng ý:

```javascript
import { followOA } from "zmp-sdk/apis";

await followOA({
  id: OA_ID
});
```

---

## 9. Interact OA

**Mục đích:** cho phép OA gửi thông báo.

```javascript
import { interactOA } from "zmp-sdk";

await interactOA({
  oaId: OA_ID
});
```

**Thời điểm gọi**

| | Thời điểm |
|---|---|
| ĐÚNG | Sau khi người dân hoàn thành đánh giá |
| SAI | Ngay khi mở Mini App |

---

## 10. OA Open API

**Xác thực:** OAuth 2.0, PKCE Flow

**Callback:** `https://domain.gov.vn/api/zalo/callback`

Sau xác thực, `OA_ACCESS_TOKEN` được dùng để gửi tin nhắn.

---

## 11. Webhook

**URL:** `POST /webhook/zalo`

**Các sự kiện cần xử lý**

| Sự kiện | Mô tả |
|---|---|
| `oa_send_text` | OA gửi tin |
| `message` | Người dùng tương tác |
| `follow` | Follow OA |
| `unfollow` | Unfollow OA |

Webhook được gửi bằng HTTP POST từ hệ thống Zalo.

---

## 12. Xác thực webhook

**Header:** `X-ZEvent-Signature`

Cần kiểm tra chữ ký trước khi xử lý dữ liệu. Zalo mô tả cơ chế ký bằng SHA256 kết hợp `appId`, dữ liệu sự kiện và OA secret.

---

## 13. Cấu hình environment

```env
ZALO_APP_ID=
ZALO_APP_SECRET=
ZALO_OA_ID=
ZALO_OA_ACCESS_TOKEN=

VITE_ZALO_APP_ID=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
```

---

## 14. Luồng dữ liệu chuẩn

```
Citizen
   |
   v
Zalo OA
   |
   v
Mini App
   |
   +--> getUserID()
   |
   +--> token
   |
   v
Backend
   |
   +--> Users
   +--> Cases
   +--> Ratings
   |
   v
Supabase
```

---

## 15. Những điều Manus không được làm

- Không lưu `APP_SECRET` ở frontend.
- Không dùng `case_id` trên URL công khai.
- Không yêu cầu phone number cho MVP.
- Không yêu cầu location.
- Không yêu cầu camera.
- Không xin quyền người dùng ngay khi mở Mini App.
- Không phụ thuộc vào tên hoặc avatar để định danh người dùng.
- Không gửi đánh giá trực tiếp từ frontend đến Supabase bằng service role key.

---

## 16. Kiến trúc chuẩn cho dự án DVHC

| Lớp | Công nghệ |
|---|---|
| Frontend | React, TypeScript, ZMP SDK, ZaUI |
| Backend | Express, TypeScript |
| Database | Supabase PostgreSQL |
| Identity | Zalo UID |
| Messaging | OA Open API |
| Notification Consent | `interactOA()` |
| Storage | Supabase Storage |

Mô hình này phù hợp để triển khai thí điểm tại Trung tâm Phục vụ Hành chính công cấp tỉnh hoặc cấp huyện, với yêu cầu gửi giấy hẹn, thu thập đánh giá hài lòng và tổng hợp báo cáo chất lượng phục vụ.
