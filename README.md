# AI Customer Support Automation — Track D

> **Trạng thái hiện tại:** Phase 1 + Phase 2 (Ngày 1 theo TDD) — Project Setup & Authentication (Identity Module).
> Kiến trúc đầy đủ nằm trong `TDD-Track-D-AI-Customer-Support.md`. Các Phase tiếp theo (Ticket/Conversation/KB, RAG, AI Workflow, Dashboard, Deployment...) sẽ được bổ sung tuần tự sau khi Phase hiện tại được xác nhận.

## Đã có trong Phase này

- Monorepo NestJS (`apps/api`, `apps/worker`, `libs/*`) theo đúng Clean Architecture 4 lớp.
- Shared Module: base Entity/AggregateRoot, `Result<T,E>`, error-code chuẩn hoá, Global Exception Filter, Response envelope.
- Config Module: validate biến môi trường bằng Zod, fail-fast khi thiếu.
- Prisma schema: `users`, `refresh_tokens` (đã bật sẵn extension `pgvector` cho Phase 3+).
- **Identity Module đầy đủ**: đăng nhập/refresh (có rotation)/đăng xuất, đổi mật khẩu, tạo Agent/Admin (Admin only), danh sách user (phân trang), RBAC qua `@Roles()` + `RolesGuard`, mọi route mặc định yêu cầu JWT trừ khi đánh dấu `@Public()`.
- Unit test cho `User` entity và `LoginUseCase`.

## Yêu cầu môi trường

- Node.js ≥ 20
- Docker + Docker Compose (chạy Postgres + Redis local)

## Cài đặt & chạy (local dev)

```bash
# 1. Cài dependency
npm install

# 2. Tạo file .env từ mẫu
cp .env.example .env
# → sửa JWT_ACCESS_SECRET / JWT_REFRESH_SECRET thành chuỗi ngẫu nhiên ≥32 ký tự
#   (vd: openssl rand -base64 48)

# 3. Bật Postgres (pgvector) + Redis
docker compose -f docker/docker-compose.yml up -d

# 4. Generate Prisma Client + chạy migration đầu tiên
npm run prisma:generate
npm run prisma:migrate:dev -- --name init

# 5. Seed tài khoản admin mặc định
npm run seed
#   email: admin@example.com | password: ChangeMe123!

# 6. Chạy API (watch mode)
npm run start:dev
```

API mặc định chạy tại `http://localhost:3000/api`.

## Thử nhanh bằng curl

```bash
# Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'

# Dùng accessToken trả về để gọi route được bảo vệ
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <accessToken>"
```

Mọi response đều bọc trong envelope chuẩn:

```json
{ "success": true, "data": { ... }, "error": null }
```

hoặc khi lỗi:

```json
{ "success": false, "data": null, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```

## Chạy test

```bash
npm run test
```

## Chạy Worker process (stub — chưa có job thật, dành cho Phase 3+)

```bash
npm run start:worker:dev
```

## Cấu trúc thư mục

Xem chi tiết giải thích trong `TDD-Track-D-AI-Customer-Support.md` — Mục 6. Tóm tắt:

```
apps/
  api/            # HTTP entrypoint (main.ts, app.module.ts)
  worker/         # Worker process entrypoint (BullMQ, chưa có processor ở Phase 1)
libs/
  shared/         # Base classes, exceptions, decorators dùng chung
  config/         # Zod env validation + config namespaces
  infrastructure/ # PrismaService/PrismaModule (Prisma Client chỉ được new ở đây)
  modules/
    identity/     # Domain / Application / Infrastructure / Presentation đầy đủ
prisma/
  schema.prisma   # Phase 1: users, refresh_tokens
  seed.ts
docker/
  docker-compose.yml
test/unit/identity/
```

## Bước tiếp theo (chờ xác nhận)

Theo đúng quy trình đã thống nhất trong TDD (Mục 19), bước kế tiếp là **Ngày 2 — Phase 3 + Phase 4: Customer/Ticket/Conversation Module & Knowledge Base** (Prisma schema đầy đủ, Ticket State Machine, `WebChannelAdapter`, upload tài liệu chưa xử lý embedding).
