# My Diller — loyiha konteksti

## 1. Loyiha maqsadi

My Diller — O‘zbekistondagi ishlab chiqaruvchilar, ulgurji xaridorlar, logistika
kompaniyalari va B2B kuratorlarni bir tizimda bog‘laydigan ulgurji savdo
platformasi.

Platforma pulni xaridordan yig‘maydi. Xaridor buyurtma bo‘yicha to‘lovni
hisob-faktura asosida to‘g‘ridan-to‘g‘ri ishlab chiqaruvchining bank
hisob-raqamiga o‘tkazadi. Tizim buyurtma jarayoni, hujjatlar, chek, yetkazib
berish, to‘lov muddati, fors-major va platforma komissiyasini nazorat qiladi.

Hozirgi versiyada tashqi to‘lov va hujjat integratsiyalari ishlatilmaydi:

- Didox va SoliqServis yo‘q;
- Click, Payme, Uzum, Uzcard/Humo integratsiyasi yo‘q;
- Telegram va Email SMTP yo‘q;
- to‘lov bank o‘tkazmasi va yuklangan kvitansiya orqali tasdiqlanadi;
- shartnoma va hisob-faktura backendda lokal PDF sifatida yaratiladi;
- bildirishnomalar sayt ichida saqlanadi.

## 2. Tizim rollari

### Xaridor

Do‘kon yoki ulgurji xaridor:

- tasdiqlangan mahsulotlarni katalogdan ko‘radi;
- MOQ talabiga muvofiq savat tuzadi;
- buyurtma beradi;
- avans yoki yakuniy to‘lov kvitansiyasini yuklaydi;
- mahsulotni qabul qilganini tasdiqlaydi;
- to‘lov muddatini kuzatadi;
- o‘z buyurtmalari, hujjatlari va bildirishnomalarini ko‘radi.

### Ishlab chiqaruvchi

Zavod yoki fabrika:

- mahsulot, narx, qoldiq, MOQ va to‘lov shartini belgilaydi;
- mahsulotni moderatsiyaga yuboradi;
- avansni tasdiqlaydi;
- buyurtmani qabul qiladi;
- mahsulot tayyorligini va jo‘natilganini tasdiqlaydi;
- yakuniy to‘lovni qabul qilganini belgilaydi;
- platforma komissiyalarini ko‘radi va kvitansiya yuklaydi.

### Admin-kurator

Muayyan zavodlarga biriktirilgan B2B broker:

- faqat o‘ziga biriktirilgan zavodlarni kuzatadi;
- zavod yaratishi mumkin; yaratilgan zavod unga avtomatik biriktiriladi;
- buyurtmalarni jadval va Kanban ko‘rinishida nazorat qiladi;
- vitrinadagi mahsulot ma’lumotlarini tezkor tahrirlaydi;
- shartnoma, hisob-faktura va kvitansiyalarni ko‘radi;
- to‘lov muddati tugagan buyurtmada fors-major haqida xabar beradi.

### Bosh admin

Platforma egasi, `general` roli:

- admin va kuratorlarni boshqaradi;
- barcha foydalanuvchi, zavod va logistika kompaniyalarini boshqaradi;
- kategoriyalar va mahsulot moderatsiyasini boshqaradi;
- barcha buyurtma, komissiya, qarz va fors-major holatlarini ko‘radi;
- rezerv fondini va komissiya foizini sozlaydi;
- fors-majorda to‘lov kafolatini ishga tushiradi;
- xaridor qarzini yig‘ilgan yoki hisobdan chiqarilgan deb belgilaydi.

### Dostavka

Logistika kompaniyasi:

- o‘ziga biriktirilgan yetkazib berishlarni ko‘radi;
- A nuqtadan yukni olganini tasdiqlaydi;
- B nuqtaga yetkazganini tasdiqlaydi;
- manzil va koordinatalarni xaritada ko‘radi.

## 3. Monorepo va domenlar

```text
landing/              → https://milliycrm.uz
admin/                → https://admin.milliycrm.uz
admin-kurator/        → https://kurator.milliycrm.uz
ishlab chiqaruvchi/   → https://zavod.milliycrm.uz
foydalanuvchi/        → https://user.milliycrm.uz
dostavka/             → https://yetkazish.milliycrm.uz
backend/              → https://api.milliycrm.uz
```

Har bir kabinet mustaqil SPA. Landing sahifa foydalanuvchini tegishli
production subdomeniga yo‘naltiradi.

Frontend API manzili har bir kabinetning `src/shared/config.ts` faylida:

```ts
export const API_URL = 'https://api.milliycrm.uz/api/v1'
```

API manzilini `.env` yoki `VITE_API_URL` orqali boshqarish loyihada
qo‘llanilmaydi.

## 4. Texnik arxitektura

```text
Browser SPA
    │
    │ HTTPS + JSON/FormData + Bearer JWT
    ▼
Go REST API (Chi)
    ├── Auth va RBAC
    ├── Biznes servislar
    ├── PDF generatsiya
    ├── Lokal fayl upload
    ├── Deadline watcher
    └── PostgreSQL (pgx)
```

### Frontend

- React 19 va TypeScript;
- Vite;
- Tailwind CSS 4;
- React Router;
- framer-motion;
- lucide-react;
- Leaflet/OpenStreetMap — lokatsiya ko‘rsatish uchun;
- native `fetch` — API so‘rovlari uchun;
- JWT localStorage’da rolga alohida kalit bilan saqlanadi.

### Backend

- Go;
- Chi router;
- PostgreSQL va pgx pool;
- golang-migrate;
- JWT HS256;
- bcrypt;
- gofpdf;
- lokal `uploads/` storage;
- Swagger/OpenAPI va `/health`.

Backend modular monolit:

```text
modules/<domen>/
    model.go
    repository.go
    service.go
    handler.go
    module.go
```

Dependency injection `backend/internal/app/app.go`, route yig‘ilishi
`backend/internal/app/router.go` ichida amalga oshiriladi.

## 5. Backend modullari

- `admin` — admin auth, profil va admin CRUD;
- `xaridor` — register/login, profil, bloklash va admin CRUD;
- `ishlabchiqaruvchi` — auth, profil, rekvizitlar, kurator biriktirish va CRUD;
- `dostavka` — logistika auth, profil va CRUD;
- `category` — kategoriya va subkategoriya;
- `product` — katalog, mahsulot CRUD va moderatsiya;
- `order` — buyurtma oqimi, PDF, to‘lov, komissiya, qarz va kafolat;
- `notification` — sayt ichidagi bildirishnomalar.

## 6. Asosiy ma’lumotlar modeli

### Mahsulot

Mahsulotda quyidagi biznes maydonlari mavjud:

- unikal SKU/kod;
- ishlab chiqaruvchi;
- nom va Quill Delta formatidagi tavsif;
- kategoriya va subkategoriya;
- ulgurji narx;
- ombor qoldig‘i;
- MOQ;
- 1–5 ta rasm;
- texnik xususiyatlar (`specs` JSON);
- to‘lov sharti va muddati;
- moderatsiya statusi va rad etish sababi.

Mahsulot statuslari:

```text
pending → approved
        ↘ rejected → resubmit → pending
```

Faqat `approved` mahsulotlar xaridor katalogida ko‘rinadi.

### Buyurtma

Bir buyurtmada faqat:

- bitta ishlab chiqaruvchining mahsulotlari;
- bir xil to‘lov sharti va muddati;
- mavjud qoldiqdan oshmagan miqdor;
- MOQ’dan kam bo‘lmagan miqdor

bo‘lishi mumkin.

Buyurtma yaratilganda mahsulot narxi, kodi, nomi va miqdori order item ichiga
snapshot sifatida yoziladi. Ombor qoldig‘i tranzaksiya va row lock bilan
kamaytiriladi.

### Hujjatlar

Buyurtma yaratilganda:

- `ORD-YYYYMMDD-XXXX` buyurtma raqami;
- `INV-YYYYMMDD-XXXX` hisob-faktura raqami;
- tomonlarning rekvizitlari bilan shartnoma;
- hisob-faktura

yaratiladi. Hujjatlarning HTML nusxasi bazada saqlanadi, PDF nusxasi API orqali
lokal generatsiya qilinib yuklab olinadi.

## 7. Buyurtma biznes oqimi

Asosiy statuslar:

```text
yangi
  → qabul_qilindi
  → logistikaga_uzatildi
  → yolda
  → yetkazildi_tolov_kutilmoqda
  → yakunlandi
```

Muammoli oqim:

```text
yetkazildi_tolov_kutilmoqda
  → fors_major
  → kafolat_bilan_yopildi
```

Bosqichlar:

1. Xaridor buyurtma beradi. Tizim stokni kamaytiradi va hujjatlarni yaratadi.
2. Avans talab qilinsa, xaridor kvitansiya yuklaydi va zavod avansni tasdiqlaydi.
3. Zavod buyurtmani qabul qiladi.
4. Zavod mahsulot tayyorligini tasdiqlaydi; logistika biriktiriladi.
5. Dostavka A nuqtadan yukni oladi.
6. Zavod mahsulot jo‘natilganini tasdiqlaydi.
7. Dostavka B nuqtaga yetkazadi.
8. Xaridor mahsulotni qabul qilganini tasdiqlaydi.
9. Zarur bo‘lsa, to‘lov taymeri boshlanadi va xaridor yakuniy chekni yuklaydi.
10. Zavod 100% to‘lov olinganini tasdiqlaydi va buyurtma yopiladi.

## 8. To‘lov shartlari

### 100% oldindan — `prepay_100`

- buyurtma yaratilganda to‘liq summa avans sifatida belgilanadi;
- xaridor avans kvitansiyasini yuklaydi;
- zavod avansni tasdiqlamaguncha buyurtmani qabul qila olmaydi.

### Muddatli to‘lov — `deferred`

- zavod 1–30 kun oralig‘idagi muddatni belgilaydi;
- xaridor mahsulotni qabul qilganidan keyin deadline boshlanadi;
- deadline yaqinlashganda backend watcher bildirishnoma yaratadi.

### Buyurtma asosida 50/50 — `pod_zakaz_50_50`

- buyurtmada summaning 50% avans sifatida belgilanadi;
- avans tasdiqlangach ishlab chiqarish boshlanadi;
- qolgan qism mahsulot qabul qilingandan keyin to‘lanadi.

To‘lov fazalari:

```text
none
awaiting_advance
advance_done
awaiting_final
paid
```

## 9. Fors-major va to‘lov kafolati

Muddatli to‘lov deadline’i tugab, buyurtma to‘lanmasa:

1. Kurator fors-major e’lon qiladi.
2. Buyurtma `fors_major` holatiga o‘tadi.
3. Bosh admin panelida favqulodda alert paydo bo‘ladi.
4. Bosh admin rezerv balans yetarli bo‘lsa kafolatni bajaradi.
5. Rezervdan buyurtma summasi ayriladi.
6. Xaridor bloklanadi.
7. Platforma nomiga ochiq qarz yozuvi yaratiladi.
8. Buyurtma `kafolat_bilan_yopildi` holatiga o‘tadi.

Qarz statuslari:

```text
open | collected | written_off
```

## 10. Komissiya

Buyurtma oddiy to‘lov yoki kafolat orqali yopilganda ishlab chiqaruvchi uchun
platforma komissiyasi yaratiladi.

- standart foiz platforma sozlamasidan olinadi, odatda 5%;
- “Hammasi bepul” aksiyasi faol bo‘lsa summa 0 va status `waived`;
- aks holda status `pending`;
- ishlab chiqaruvchi komissiya kvitansiyasini yuklaydi;
- admin to‘lov holatini nazorat qiladi.

Komissiya statuslari:

```text
pending | paid | waived
```

## 11. Bildirishnomalar va timer

Bildirishnomalar `recipient_type` va `recipient_id` orqali rol egasiga
biriktiriladi. Kabinetlarda:

- unread badge;
- ro‘yxat;
- bitta yoki barchasini o‘qilgan qilish;
- yangi bildirishnomada Web Audio orqali tovush;
- tovushni localStorage orqali o‘chirish

mavjud.

Order deadline watcher har daqiqada muddatlarni tekshiradi. To‘lov muddatiga
24 soatdan kam qolgan va hali ogohlantirilmagan buyurtma bo‘yicha xaridor,
ishlab chiqaruvchi va kuratorga bildirishnoma yaratiladi.

Bu Web Push yoki Email emas; bildirishnomani ko‘rish uchun kabinet API’ni polling
qiladi.

## 12. Xavfsizlik va ruxsatlar

JWT `subject_type`:

```text
admin | ishlabchiqaruvchi | xaridor | dostavka
```

Admin rollari:

```text
general | admin | kurator
```

Backend ruxsatni ikkita qatlamda tekshiradi:

- `RequireSubject` — kabinet turi;
- `RequireRole` — admin ichidagi rol.

Frontenddagi tugma yoki menyuni yashirish xavfsizlik chegarasi emas. Har bir
kritik amal backendda ownership, subject va role bo‘yicha tekshirilishi shart.

## 13. Konfiguratsiya

Backendning yagona runtime konfiguratsiyasi:

```text
backend/config.json
```

Unda:

- HTTP port;
- PostgreSQL ulanishi;
- JWT secret va TTL;
- CORS originlari;
- upload papkasi va public URL

saqlanadi.

Frontendlar API URL’ni `.env` dan o‘qimaydi. Har bir frontenddagi
`src/shared/config.ts` yagona manba.

## 14. Dizayn va til

- barcha interfeys va xatoliklar o‘zbek tilida, lotin yozuvida;
- asosiy rang: `#102d26`;
- accent: `#c9f560`;
- mobil va desktop responsive dizayn;
- mavjud komponent va vizual uslub yangi sahifalarda saqlanishi kerak.

## 15. O‘zgartirish kiritishda tekshiriladigan bog‘liqliklar

Buyurtma yoki to‘lov oqimi o‘zgarsa quyidagilar birga tekshiriladi:

1. DB migratsiya va model;
2. repository query va scan tartibi;
3. service status transition va transaction;
4. handler va route ruxsati;
5. xaridor UI;
6. ishlab chiqaruvchi UI;
7. dostavka UI;
8. kurator UI;
9. bosh admin UI;
10. bildirishnoma, PDF, komissiya va qarz oqimi.

Mahsulot modeli o‘zgarsa zavod create/edit, kurator quick edit, admin edit,
xaridor katalog va order snapshot birga tekshiriladi.

## 16. Ma’lum texnik qarzlar

- yakuniy to‘lovni zavod tasdiqlashida kvitansiya majburiyligi to‘liq
  tekshirilmaydi;
- komissiyaning “zavod to‘ladi” va “admin tasdiqladi” bosqichlari alohida
  statuslarga ajratilmagan;
- bekor qilingan buyurtma oqimi va stokni qaytarish mexanizmi yo‘q;
- `config.json` ichidagi `domains` bo‘limi runtime config struct tomonidan
  ishlatilmaydi;
- production JWT secret xavfsiz qiymatga almashtirilishi kerak;
- Nginx upload uchun `client_max_body_size` backenddagi 5 MB limitdan kam
  bo‘lmasligi kerak;
- admin frontendda `general` bo‘lmagan rollarga buyurtma menyusini ko‘rsatish,
  product update payload va `limit > 100` so‘rovlari alohida tuzatilishi kerak.

## 17. Tekshirish buyruqlari

```bash
# Backend
cd backend
go build ./...
go vet ./...

# Har bir frontend
npm run build

# Frontendlar
admin
admin-kurator
ishlab chiqaruvchi
foydalanuvchi
dostavka
landing
```

Deploy qilinadigan frontend artefakti har bir ilovaning `dist/` papkasida
hosil bo‘ladi.
