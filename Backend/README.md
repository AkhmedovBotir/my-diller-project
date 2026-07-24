# Diller Backend

Go + PostgreSQL asosidagi Modular Monolith backend.

## Texnologiyalar

- **Go 1.26** — asosiy til
- **PostgreSQL** — ma'lumotlar bazasi (`pgx/v5` drayveri)
- **chi** — HTTP router
- **golang-migrate** — migratsiyalar (binary ichiga embed qilingan, server ishga tushganda avtomatik bajariladi)
- **JWT** (`golang-jwt/jwt/v5`) — autentifikatsiya
- **bcrypt** — parol hashlash

## Struktura

```
backend/
├── cmd/
│   ├── api/                  # Asosiy server
│   └── create-admin/         # General admin yaratish CLI
├── modules/                  # Biznes modullar
│   ├── admin/                # Admin: CRUD, login, profil
│   ├── xaridor/              # Xaridor (bo'sh)
│   └── ishlabchiqaruvchi/    # Ishlab chiqaruvchi (bo'sh)
├── internal/
│   ├── app/                  # Modullarni yig'ish, router
│   ├── config/               # Konfiguratsiya (.env / env variables)
│   └── pkg/                  # Umumiy ichki paketlar
│       ├── auth/             # JWT token + middleware
│       ├── database/         # Postgres pool + migratsiya
│       ├── httpserver/       # Graceful shutdown bilan server
│       └── httputil/         # JSON javob helperlari
├── docs/                     # Swagger (openapi.yaml) + API hujjatlar (admins.md)
└── migrations/               # SQL migratsiyalar (embed)
```

## Ishga tushirish

```bash
# 1. PostgreSQL ni ko'tarish
docker compose up -d postgres

# 2. config.json yaratish
cp config.example.json config.json
# Kerakli sozlamalarni (DB parol, CORS origin, JWT) tahrirlang

# 3. Birinchi general adminni yaratish
go run ./cmd/create-admin -first-name Ali -last-name Valiyev -phone +998901234567 -username admin -password secret123

# 4. Serverni ishga tushirish (migratsiyalar avtomatik bajariladi)
go run ./cmd/api
```

Barcha sozlamalar `config.json` da: `app_env`, `http_port`, `database`, `jwt`, `cors`.
Boshqa fayl ishlatish uchun: `CONFIG_PATH=./prod.json go run ./cmd/api`.

Server `http://localhost:8080` da ishlaydi.

## API hujjatlar

- **Swagger UI**: [http://localhost:8080/swagger](http://localhost:8080/swagger)
- **Admin**: [docs/admins.md](docs/admins.md)
- **Ishlab chiqaruvchi**: [docs/ishlabchiqaruvchilar.md](docs/ishlabchiqaruvchilar.md)
- **Kategoriya / Subkategoriya**: [docs/categories.md](docs/categories.md)
- **Mahsulot (ishlabchiqaruvchi)**: [docs/products-ishlabchiqaruvchi.md](docs/products-ishlabchiqaruvchi.md)
- **Mahsulot (admin)**: [docs/products-admin.md](docs/products-admin.md)

## Admin turlari

| Turi      | Huquqlar                                              |
|-----------|-------------------------------------------------------|
| `general` | To'liq: adminlarni yaratish, yangilash, o'chirish     |
| `admin`   | Ro'yxat/ko'rish, o'z profili                          |
| `kurator` | Ro'yxat/ko'rish, o'z profili                          |

## Asosiy endpointlar

| Method | Endpoint                    | Tavsif                        | Ruxsat        |
|--------|-----------------------------|-------------------------------|---------------|
| GET    | `/health`                   | Server holati                 | ochiq         |
| POST   | `/api/v1/admin/auth/login`  | Admin login                   | ochiq         |
| GET    | `/api/v1/admin/profile`     | Profil ma'lumotlari           | token         |
| PUT    | `/api/v1/admin/profile`     | Profilni yangilash            | token         |
| GET    | `/api/v1/admin/admins`      | Adminlar ro'yxati             | token         |
| GET    | `/api/v1/admin/admins/{id}` | Bitta admin                   | token         |
| POST   | `/api/v1/admin/admins`      | Admin yaratish                | faqat general |
| PUT    | `/api/v1/admin/admins/{id}` | Adminni yangilash             | faqat general |
| DELETE | `/api/v1/admin/admins/{id}` | Adminni o'chirish             | faqat general |

## Yangi modul qo'shish

1. `modules/<nomi>/` papkasini yarating — `admin` modulidan nusxa oling (`module.go`, `handler.go`, `service.go`, `repository.go`, `model.go`).
2. `migrations/` ga yangi migratsiya qo'shing: `00000X_<nomi>.up.sql` va `.down.sql`.
3. `internal/app/app.go` da modulni initsializatsiya qiling va `router.go` da route'larini ulang.

Modullar bir-biriga faqat `Module` strukturasidagi public service orqali murojaat qilishi kerak — bu keyinchalik mikroservisga ajratishni osonlashtiradi.
