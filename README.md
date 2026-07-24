# My Diller

B2B ulgurji savdo platformasi (`milliycrm.uz`).

Xaridor, ishlab chiqaruvchi, dostavka, kurator va bosh admin alohida kabinetlar orqali ishlaydi. To‘lov bank o‘tkazmasi + kvitansiya orqali; Didox/Click/Payme/Telegram integratsiyasi yo‘q.

## Papkalar

| Papka | Domen |
|-------|--------|
| `landing/` | milliycrm.uz |
| `admin/` | admin.milliycrm.uz |
| `admin-kurator/` | kurator.milliycrm.uz |
| `ishlab chiqaruvchi/` | zavod.milliycrm.uz |
| `foydalanuvchi/` | user.milliycrm.uz |
| `dostavka/` | yetkazish.milliycrm.uz |
| `backend/` | api.milliycrm.uz |

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

- Frontend API: har bir app ichida `src/shared/config.ts` → `https://api.milliycrm.uz/api/v1`
- Backend: `backend/config.json` (DB, JWT, CORS, upload)

## Hujjatlar

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — biznes mantig‘i va arxitektura
- [AGENTS.md](./AGENTS.md) — agent / ishlash xaritasi
