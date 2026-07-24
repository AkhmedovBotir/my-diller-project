# Ishlab chiqaruvchi API Hujjatlari

Barcha endpointlar `http://localhost:8080/api/v1` prefiksi bilan ishlaydi.

Himoyalangan endpointlar uchun headerda JWT token yuboriladi:

```
Authorization: Bearer <token>
```

## Ma'lumotlar

| Maydon         | Tavsif                          |
|----------------|---------------------------------|
| `company_name` | Korxona / firma nomi            |
| `first_name`   | Mas'ul shaxs ismi               |
| `last_name`    | Mas'ul shaxs familiyasi         |
| `phone`        | Telefon raqam                   |
| `username`     | Login uchun foydalanuvchi nomi  |
| `password`     | Parol (kamida 6 belgi)          |

## Ruxsatlar

| Amal                         | Kim bajaradi                         |
|------------------------------|--------------------------------------|
| Login                        | Ochiq                                |
| Profil olish / yangilash     | Ishlab chiqaruvchi token             |
| CRUD (ro'yxat, yaratish...)  | Admin token (barcha admin turlari)   |

---

## 1. Login

**POST** `/ishlabchiqaruvchi/auth/login` — ochiq endpoint.

Request:

```json
{
  "username": "samsung_uz",
  "password": "secret123"
}
```

Response `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ishlabchiqaruvchi": {
    "id": 1,
    "company_name": "Samsung Uzbekistan",
    "first_name": "Jasur",
    "last_name": "Karimov",
    "phone": "+998901112233",
    "username": "samsung_uz",
    "created_at": "2026-07-24T12:00:00Z",
    "updated_at": "2026-07-24T12:00:00Z"
  }
}
```

Xatolar: `400` — validatsiya, `401` — login yoki parol noto'g'ri.

---

## 2. Profil

### 2.1 Profilni olish

**GET** `/ishlabchiqaruvchi/profile` — ishlab chiqaruvchi tokeni bilan.

Response `200`: ishlab chiqaruvchi obyekti.

### 2.2 Profilni yangilash

**PUT** `/ishlabchiqaruvchi/profile`

Request (`password` yuborilmasa yoki bo'sh bo'lsa parol o'zgarmaydi):

```json
{
  "company_name": "Samsung Uzbekistan",
  "first_name": "Jasur",
  "last_name": "Karimov",
  "phone": "+998901112233",
  "username": "samsung_uz",
  "password": "yangi_parol"
}
```

Response `200`: yangilangan obyekt.

Xatolar: `400`, `401`, `403` (admin tokeni bilan kirilsa), `409`.

---

## 3. Ishlab chiqaruvchilar CRUD (admin)

Barcha CRUD endpointlari **admin token** talab qiladi.

### 3.1 Ro'yxat

**GET** `/ishlabchiqaruvchilar?limit=20&offset=0`

Response `200`:

```json
[
  {
    "id": 1,
    "company_name": "Samsung Uzbekistan",
    "first_name": "Jasur",
    "last_name": "Karimov",
    "phone": "+998901112233",
    "username": "samsung_uz",
    "created_at": "2026-07-24T12:00:00Z",
    "updated_at": "2026-07-24T12:00:00Z"
  }
]
```

### 3.2 Bitta yozuv

**GET** `/ishlabchiqaruvchilar/{id}`

Response `200`: obyekt. Xato: `404`.

### 3.3 Yaratish

**POST** `/ishlabchiqaruvchilar`

Request:

```json
{
  "company_name": "Samsung Uzbekistan",
  "first_name": "Jasur",
  "last_name": "Karimov",
  "phone": "+998901112233",
  "username": "samsung_uz",
  "password": "secret123"
}
```

Response `201`: yaratilgan obyekt.

Xatolar: `400`, `401`, `403`, `409`.

### 3.4 Yangilash

**PUT** `/ishlabchiqaruvchilar/{id}`

Request (`password` ixtiyoriy):

```json
{
  "company_name": "Samsung Uzbekistan",
  "first_name": "Jasur",
  "last_name": "Karimov",
  "phone": "+998901112233",
  "username": "samsung_uz",
  "password": "yangi_parol"
}
```

Response `200`: yangilangan obyekt.

### 3.5 O'chirish

**DELETE** `/ishlabchiqaruvchilar/{id}`

Response `204`: body yo'q.

---

## Xato formati

```json
{
  "code": "NOTOGRI_SOROV",
  "message": "Korxona nomi kiritilishi shart",
  "field": "company_name"
}
```

## Swagger

Interaktiv hujjatlar: [http://localhost:8080/swagger](http://localhost:8080/swagger)
