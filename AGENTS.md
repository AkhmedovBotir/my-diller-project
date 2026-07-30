# My Diller — agent qo‘llanmasi

Monorepo: B2B ulgurji savdo (`mydiller.uz`).

## Tezkor xarita

```
landing/              → mydiller.uz
admin/                → admin.mydiller.uz
admin-kurator/        → kurator.mydiller.uz
ishlab chiqaruvchi/   → zavod.mydiller.uz
foydalanuvchi/        → user.mydiller.uz
dostavka/             → yetkazish.mydiller.uz
backend/              → api.mydiller.uz  (Go, :8080)
```

## Konfig

| Joy | Fayl |
|-----|------|
| Frontend API | har bir app: `src/shared/config.ts` → `API_URL` |
| Backend | `backend/config.json` (DB, JWT, CORS, upload) |
| Cursor rules | `.cursor/rules/*.mdc` |

## Buyruqlar

```bash
# Backend
cd backend && go run ./cmd/api

# Frontend build (har biri)
cd admin && npm run build
# ... admin-kurator, "ishlab chiqaruvchi", foydalanuvchi, dostavka, landing
```

## Muhim biznes oqim

1. Xaridor buyurtma → shartnoma/invoice  
2. Avans (prepay / 50-50) → zavod tasdiq  
3. Qabul → tayyor → dostavka pickup → ship → yetkazish → xaridor receive  
4. Timer → to‘lov / fors-major → kafolat  
5. 5% komissiya (yoki bepul aksiya)

Integratsiya yo‘q: Didox, Click/Payme/Uzum, Telegram, Email SMTP.
