# API Contract — Đánh giá Dịch vụ Công

## Luồng chuẩn

```text
Citizen → Zalo OA → Zalo Mini App → getUserID() + token → Backend API → Supabase
```

Không có ZBS, ZNS, Vote template hoặc màn hình quản lý template.

## API

| Nhóm | Endpoint | Mục đích |
|---|---|---|
| Cases | `GET /api/public-service/cases` | Cán bộ xem hồ sơ |
| Cases | `POST /api/public-service/cases` | Tạo hồ sơ và token |
| Cases | `POST /api/public-service/cases/:id/upload` | Lưu PDF private |
| Cases | `POST /api/public-service/cases/:id/link` | Liên kết hồ sơ với Zalo UID |
| Cases | `POST /api/public-service/cases/:id/send` | Gửi PDF và tin mời qua OA |
| Cases | `POST /api/public-service/cases/:id/retry` | Retry riêng phần PDF/lời mời |
| Mini App | `GET /api/public-service/cases/by-token/:token` | Lấy đúng hồ sơ |
| Ratings | `POST /api/public-service/ratings` | Ghi nhận đánh giá một lần |
| OA | `GET /api/zalo/oauth/start` | OAuth Authorization Code + PKCE |
| OA | `GET /api/zalo/oauth/callback` | Callback OAuth và xác minh domain |
| OA | `POST /api/webhook/zalo` | Nhận sự kiện có chữ ký |

## Rating request

```json
{"token":"case-token","oaUid":"zalo-user-id-from-sdk","stars":5,"comment":"Hỗ trợ tốt","commentConsent":true}
```

`stars` bắt buộc từ 1–5; `comment` tối đa 1.000 ký tự; có góp ý phải đồng ý; một hồ sơ chỉ nhận một đánh giá.

## Token và định danh

Token được sinh ngẫu nhiên, chỉ lưu hash ở backend. Mini App gọi `getUserInfo()` và ưu tiên `userInfo.idByOA` để backend đối chiếu với liên kết hồ sơ; `getUserID()` chỉ là ID theo Zalo App, dùng làm thông tin phụ. Không dùng phone, location, avatar hoặc mã hồ sơ làm khóa định danh.

## OA message flow

Backend upload PDF, gửi PDF tới UID đã liên kết, sau đó gửi tin OA chứa đường dẫn Mini App có token. Token không chứa thông tin cá nhân.
