# Đánh Giá Dịch Vụ Công

**Tên tiếng Anh:** Public Service Satisfaction Rating Platform

---

## 1. Project Overview

### Mục tiêu

Xây dựng hệ thống đánh giá mức độ hài lòng của công dân đối với dịch vụ hành chính công thông qua **Zalo OA** và **Zalo Mini App**.

Người dân nhận giấy hẹn trả kết quả từ Zalo OA. Tin nhắn chứa nút **"Đánh giá dịch vụ"**.

Khi nhấn nút:

- Mở Zalo Mini App
- Hiển thị hồ sơ tương ứng
- Đánh giá 1–5 sao
- Gửi góp ý
- Lưu dữ liệu
- Tổng hợp báo cáo

MVP phải triển khai được thực tế tại **Trung tâm Phục vụ Hành chính công**.

---

## 2. Business Flow

| Bước | Mô tả |
|---|---|
| 1 | Cán bộ tiếp nhận hồ sơ |
| 2 | Hệ thống tạo hồ sơ |
| 3 | Cán bộ tải lên PDF giấy hẹn |
| 4 | Hệ thống gửi tin nhắn OA |
| 5 | Người dân bấm nút; Mini App mở bằng `case_id` và `token` |
| 6 | Mini App hiển thị hồ sơ |
| 7 | Người dân chấm sao |
| 8 | Dữ liệu lưu vào Supabase |
| 9 | Dashboard cập nhật realtime |

**Nội dung tin nhắn OA (Bước 4):**

> Trung tâm Phục vụ Hành chính công
>
> Hồ sơ của Quý công dân đã được tiếp nhận.
>
> Vui lòng xem giấy hẹn đính kèm.
>
> Đánh giá chất lượng phục vụ:
> **[Nút Đánh giá]**

---

## 3. System Architecture

| Lớp | Công nghệ |
|---|---|
| Frontend | Zalo Mini App, React, TypeScript, Vite, ZaUI, ZMP SDK |
| Backend | NodeJS, Express, TypeScript |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |

### Deployment

| Thành phần | Nền tảng |
|---|---|
| Frontend | Vercel |
| Backend | Railway hoặc Render |
| Database | Supabase |

---

## 4. Non-Functional Requirements

- Mobile First
- Responsive
- Fast Load
- TTFB dưới 1 giây
- Bundle dưới 1MB
- TypeScript Strict Mode
- ESLint
- Prettier
- Clean Architecture
- Reusable Components
- Environment Variables
- No Hardcoded Secrets

---

## 5. Project Structure

```
root
├── apps
│   ├── miniapp
│   └── backend
├── packages
│   └── shared
├── docs
└── scripts
```

### Mini App Structure

```
src
├── pages
│   ├── Home
│   ├── Rating
│   └── Success
├── components
│   ├── StarRating
│   ├── CaseInfoCard
│   ├── FeedbackForm
│   ├── LoadingScreen
│   └── ErrorScreen
├── hooks
├── api
├── services
├── store
├── types
├── utils
├── layouts
└── constants
```

### Backend Structure

```
src
├── controllers
├── services
├── repositories
├── middlewares
├── routes
├── validators
├── types
├── utils
├── config
├── database
└── jobs
```

---

## 6. Database Design

### Table `users`

| Cột | Kiểu |
|---|---|
| id | uuid |
| zalo_uid | text, unique |
| display_name | text |
| avatar | text |
| created_at | timestamp |
| updated_at | timestamp |

### Table `cases`

| Cột | Kiểu |
|---|---|
| id | uuid |
| case_code | text, unique |
| citizen_name | text |
| procedure_name | text |
| department_name | text |
| officer_name | text |
| appointment_date | timestamp |
| pdf_url | text |
| token | text, unique |
| status | text |
| created_at | timestamp |
| updated_at | timestamp |

### Table `ratings`

| Cột | Kiểu |
|---|---|
| id | uuid |
| case_id | uuid |
| user_id | uuid |
| stars | integer |
| comment | text |
| created_at | timestamp |

### Table `rating_tags`

| Cột | Kiểu |
|---|---|
| id | uuid |
| rating_id | uuid |
| tag_name | text |
| created_at | timestamp |

### Table `audit_logs`

| Cột | Kiểu |
|---|---|
| id | uuid |
| action | text |
| payload | jsonb |
| created_at | timestamp |

---

## 7. Supabase Storage

- **Bucket:** `appointment-files`
- **Folder structure:**

```
appointment-files/
└── 2026/
    └── 10/
        └── case_id.pdf
```

---

## 8. Authentication

- Mini App sử dụng Zalo SDK.
- Không cần đăng nhập.
- Lấy thông tin người dùng bằng SDK.

Khi mở app, gọi `getUserInfo()` và lưu:

- `zalo_uid`
- `display_name`
- `avatar`

Backend sinh **JWT nội bộ**.

---

## 9. API Design

| Method | Endpoint |
|---|---|
| GET | `/health` |
| GET | `/api/cases/:token` |
| POST | `/api/ratings` |
| GET | `/api/dashboard/summary` |
| GET | `/api/dashboard/stars` |
| GET | `/api/dashboard/departments` |
| GET | `/api/dashboard/officers` |
| POST | `/api/upload` |
| POST | `/api/send-zalo` |

### API Response Standard

Các trường: `success`, `message`, `data`, `timestamp`.

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

### Case API

`GET /api/cases/:token`

```json
{
  "caseCode": "HS2026001",
  "citizenName": "Nguyen Van A",
  "procedureName": "Cap ban sao khai sinh",
  "departmentName": "Tu phap",
  "officerName": "Nguyen Van B",
  "appointmentDate": "2026-10-01"
}
```

---

## 10. Rating Rules

- Một hồ sơ chỉ đánh giá một lần.
- Một UID chỉ đánh giá một lần.
- Stars bắt buộc.
- Comment tối đa 1000 ký tự.

### Star Behavior

**Nếu 1–3 sao**, hiển thị:

- Thời gian xử lý lâu
- Hướng dẫn chưa rõ
- Thái độ phục vụ
- Khó khăn khi nộp hồ sơ
- Khác

**Nếu 4–5 sao**, hiển thị:

- Thân thiện
- Nhanh chóng
- Minh bạch
- Hỗ trợ tốt
- Dễ thực hiện

---

## 11. Mini App Pages

### Home Page

- Logo
- Tên đơn vị
- Thông tin hồ sơ
- Button: **Bắt đầu đánh giá**

### Rating Page

- Thông tin hồ sơ
- 5 sao
- Tag Selection
- Comment
- Submit Button

### Success Page

- Cảm ơn
- Số sao
- Mã hồ sơ
- Button: **Đóng**

---

## 12. Component Specification

| Component | Props | Ghi chú |
|---|---|---|
| `StarRating` | `value`, `onChange`, `maxStars` | `maxStars` mặc định 5; animation Scale Effect |
| `FeedbackForm` | `stars`, `onSubmit` | |
| `CaseInfoCard` | `caseData` | |

---

## 13. State Management

**Zustand**, với các store:

- `userStore`
- `caseStore`
- `ratingStore`

---

## 14. Validation

**Zod**

| Trường | Quy tắc |
|---|---|
| Case Token | Required |
| Stars | 1–5 |
| Comment | Max 1000 |

---

## 15. Error Handling

Hiển thị thông báo thân thiện cho các trường hợp:

- Invalid Token
- Case Not Found
- Case Already Rated
- Server Error
- Network Error

---

## 16. Logging

**Winston**, ghi ra:

- Console
- File
- Audit Table

---

## 17. Security

- Rate Limiting
- Helmet
- CORS
- Input Validation
- Parameterized Queries
- JWT
- Environment Variables

---

## 18. Dashboard

- **Admin Login:** Email + Password

**Summary Cards**

- Total Ratings
- Average Rating
- 5 Star Percentage

**Charts**

- Star Distribution
- Department Distribution
- Officer Distribution

**Khác**

- Recent Feedback
- Export CSV

### CSV Export

Các trường: `Date`, `Case Code`, `Department`, `Officer`, `Stars`, `Comment`.

---

## 19. Zalo OA Integration

**Service Name:** `ZaloOAService`

**Methods**

- `sendAppointment()`
- `sendRatingInvitation()`
- `uploadAttachment()`

**Input:** `caseId`, `zaloUid`, `pdfUrl`

**Output:** `messageId`, `status`

---

## 20. Token Flow

1. Backend tạo token (case token, dạng UUID v4).
2. Lưu vào database.
3. OA gửi liên kết: `miniapp?token=xxxxx`.
4. Mini App gọi `GET case by token`.

---

## 21. Deployment

### Frontend (Vercel)

| Biến môi trường |
|---|
| `VITE_API_URL` |
| `VITE_ZALO_APP_ID` |

### Backend (Railway)

| Biến môi trường |
|---|
| `PORT` |
| `SUPABASE_URL` |
| `SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` |
| `JWT_SECRET` |

---

## 22. Testing

| Phạm vi | Công cụ | Coverage |
|---|---|---|
| Unit Tests (Frontend) | Vitest | 80% |
| Backend | Jest, Supertest | 80% |

---

## 23. CI/CD

**GitHub Actions:** Lint → Build → Test → Deploy

---

## 24. Seed Data

- 20 Cases
- 50 Ratings
- 5 Departments
- 10 Officers

---

## 25. UI Style Guide

| Thuộc tính | Giá trị |
|---|---|
| Primary Color | `#0068FF` |
| Secondary | `#F5F7FA` |
| Success | `#34C759` |
| Danger | `#FF3B30` |
| Border Radius | 12px |
| Font | System |
| Spacing | 8px Grid |

---

## 26. Accessibility

- Touch Target: 44px
- Contrast AA
- Keyboard Navigation
- Screen Reader Labels

---

## 27. Build Instructions for Manus

Generate complete **production-ready** codebase.

### Requirements

1. Create monorepo structure.
2. Generate frontend mini app.
3. Generate backend API.
4. Generate Supabase schema.
5. Generate migrations.
6. Generate seed scripts.
7. Generate Dockerfiles.
8. Generate docker-compose.
9. Generate README.
10. Generate `.env.example`.
11. Generate API documentation.
12. Generate OpenAPI spec.
13. Generate test cases.
14. Generate CI/CD workflows.
15. Generate deployment scripts.
16. Generate dashboard.
17. Generate CSV export.
18. Generate Zalo SDK integration abstraction layer.
19. Generate OA service interface.
20. All code must compile successfully.

### Deliverables

- Full source code
- SQL schema
- Environment examples
- Deployment guide
- API documentation
- Architecture diagram in Mermaid
- Sequence diagrams
- Test report template

### Code Quality Target

Enterprise-grade MVP suitable for pilot deployment at a Provincial Public Administration Service Center.
