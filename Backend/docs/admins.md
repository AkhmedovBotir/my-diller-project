# Admin API Hujjatlari

Barcha endpointlar `http://localhost:8080/api/v1` prefiksi bilan ishlaydi.

Himoyalangan endpointlar uchun headerda JWT token yuboriladi:

```
Authorization: Bearer <token>
```

## Admin turlari

| Turi      | Tavsif                                                        |
|-----------|---------------------------------------------------------------|
| `general` | Bosh admin — adminlarni yaratish, yangilash, o'chirish mumkin |
| `admin`   | Oddiy admin                                                    |
| `kurator` | Kurator                                                        |

Birinchi general admin CLI orqali yaratiladi:

```bash
go run ./cmd/create-admin -first-name Ali -last-name Valiyev -phone +998901234567 -username admin -password secret123
```

---

## 1. Login

**POST** `/admin/auth/login` — ochiq endpoint, token talab qilinmaydi.

Request:

```json
{
  "username": "admin",
  "password": "secret123"
}
```

Response `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "first_name": "Ali",
    "last_name": "Valiyev",
    "phone": "+998901234567",
    "username": "admin",
    "type": "general",
    "created_at": "2026-07-21T11:00:00Z",
    "updated_at": "2026-07-21T11:00:00Z"
  }
}
```

Xatolar: `400` — validatsiya, `401` — login yoki parol noto'g'ri.

---

## 2. Profil

### 2.1 Profilni olish

**GET** `/admin/profile` — token egasining ma'lumotlari.

Response `200`:

```json
{
  "id": 1,
  "first_name": "Ali",
  "last_name": "Valiyev",
  "phone": "+998901234567",
  "username": "admin",
  "type": "general",
  "created_at": "2026-07-21T11:00:00Z",
  "updated_at": "2026-07-21T11:00:00Z"
}
```

### 2.2 Profilni yangilash

**PUT** `/admin/profile`

Request (`password` yuborilmasa yoki bo'sh bo'lsa parol o'zgarmaydi, `type` o'zgartirib bo'lmaydi):

```json
{
  "first_name": "Ali",
  "last_name": "Valiyev",
  "phone": "+998901234567",
  "username": "admin",
  "password": "yangi_parol"
}
```

Response `200`: yangilangan admin obyekti.

Xatolar: `400` — validatsiya, `401` — token, `409` — username band.

---

## 3. Adminlar CRUD

Ro'yxat va bitta adminni ko'rish — barcha adminlarga ochiq (token bilan).
Yaratish, yangilash, o'chirish — **faqat `general` admin** uchun (aks holda `403`).

### 3.1 Adminlar ro'yxati

**GET** `/admin/admins?limit=20&offset=0`

Response `200`:

```json
[
  {
    "id": 1,
    "first_name": "Ali",
    "last_name": "Valiyev",
    "phone": "+998901234567",
    "username": "admin",
    "type": "general",
    "created_at": "2026-07-21T11:00:00Z",
    "updated_at": "2026-07-21T11:00:00Z"
  }
]
```

### 3.2 Bitta admin

**GET** `/admin/admins/{id}`

Response `200`: admin obyekti. Xato: `404` — topilmadi.

### 3.3 Admin yaratish

**POST** `/admin/admins` (faqat general)

Request:

```json
{
  "first_name": "Vali",
  "last_name": "Aliyev",
  "phone": "+998907654321",
  "username": "vali_kurator",
  "password": "secret123",
  "type": "kurator"
}
```

`type` qiymatlari: `general`, `admin`, `kurator`. Parol kamida 6 belgi.

Response `201`: yaratilgan admin obyekti.

Xatolar: `400` — validatsiya, `403` — ruxsat yo'q, `409` — username band.

### 3.4 Adminni yangilash

**PUT** `/admin/admins/{id}` (faqat general)

Request (`password` ixtiyoriy):

```json
{
  "first_name": "Vali",
  "last_name": "Aliyev",
  "phone": "+998907654321",
  "username": "vali_kurator",
  "type": "admin",
  "password": "yangi_parol"
}
```

Response `200`: yangilangan admin obyekti.

Xatolar: `400`, `403`, `404`, `409`.

### 3.5 Adminni o'chirish

**DELETE** `/admin/admins/{id}` (faqat general)

Response `204`: body yo'q.

Xatolar: `403` — ruxsat yo'q, `404` — topilmadi.

---

## Xato formati

Barcha xatolar bir xil formatda va o'zbek tilida qaytadi. `field`
xatolik qaysi maydonda ekanini ko'rsatadi (umumiy xatolarda bo'lmasligi mumkin):

```json
{
  "code": "NOTOGRI_SOROV",
  "message": "Foydalanuvchi nomi kiritilishi shart",
  "field": "username"
}
```

Xatolik kodlari: `NOTOGRI_SOROV`, `AUTENTIFIKATSIYA_XATOSI`,
`RUXSAT_YOQ`, `TOPILMADI`, `TAKRORIY_MALUMOT`, `ICHKI_SERVER_XATOSI`.

## Swagger

Interaktiv hujjatlar: [http://localhost:8080/swagger](http://localhost:8080/swagger)
