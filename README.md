# My Diller

B2B ulgurji savdo platformasi (`mydiller.uz`).

Xaridor, ishlab chiqaruvchi, dostavka, kurator va bosh admin alohida kabinetlar orqali ishlaydi. To‘lov bank o‘tkazmasi + kvitansiya orqali; Didox/Click/Payme/Telegram integratsiyasi yo‘q.

## Papkalar

| Papka | Domen |
|-------|--------|
| `landing/` | mydiller.uz |
| `admin/` | admin.mydiller.uz |
| `admin-kurator/` | kurator.mydiller.uz |
| `ishlab chiqaruvchi/` | zavod.mydiller.uz |
| `foydalanuvchi/` | user.mydiller.uz |
| `dostavka/` | yetkazish.mydiller.uz |
| `backend/` | api.mydiller.uz |

## Ishga tushirish

```bash
# Backend
cd backend
# config.json ni sozlang
go run ./cmd/api

# Frontend (har bir app)
cd admin   # yoki admin-kurator, "ishlab chiqaruvchi", foydalanuvchi, dostavka, landing
npm install
npm run dev
npm run build   # production → dist/
```

## Konfig

- Frontend API: har bir app ichida `src/shared/config.ts` → `https://api.mydiller.uz/api/v1`
- Backend: `backend/config.json` (DB, JWT, CORS, upload)

## Hujjatlar

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — biznes mantig‘i va arxitektura
- [AGENTS.md](./AGENTS.md) — agent / ishlash xaritasi
