# Mahsulot API — Ishlab chiqaruvchi

Base URL: `http://localhost:8080/api/v1`

Barcha endpointlar **ishlabchiqaruvchi JWT token** talab qiladi:

```
Authorization: Bearer <token>
```

## Holatlar (status)

| Status     | Ma'nosi                                      |
|------------|----------------------------------------------|
| `pending`  | Admin tasdiqlashi kutilmoqda                 |
| `approved` | Admin tasdiqlagan                            |
| `rejected` | Admin bekor qilgan (`rejection_note` bilan)  |

Yangi mahsulot `pending` holatida yaratiladi. Bekor qilingan mahsulotni
`/resubmit` yoki `PUT` orqali qayta yuborish mumkin — yana `pending` bo'ladi.

Mahsulot kodi (`code`) avtomatik yaratiladi: `MK9-99U` formatida
(3 katta harf/raqam + `-` + 3 katta harf/raqam), **barcha** ishlab chiqaruvchilar
bo'yicha unikal.

## Maydonlar

| Maydon           | Tavsif                                              |
|------------------|-----------------------------------------------------|
| `images`         | 1–5 ta rasm, har biri max 5 MB (jpeg/png/webp/gif)  |
| `name`           | Mahsulot nomi                                       |
| `description`    | Quill/Delta JSON: `{"ops":[...]}`                   |
| `category_id`    | Kategoriya ID                                       |
| `subcategory_id` | Subkategoriya ID (shu kategoriyaga tegishli)        |
| `price`          | Narx (>= 0)                                         |
| `quantity`       | Soni (>= 0)                                         |

---

## 1. Mahsulot yaratish

**POST** `/ishlabchiqaruvchi/products`

`multipart/form-data`:

| Field            | Type   | Majburiy |
|------------------|--------|----------|
| `name`           | text   | ha       |
| `description`    | text   | ha (Delta JSON string) |
| `category_id`    | text   | ha       |
| `subcategory_id` | text   | ha       |
| `price`          | text   | ha       |
| `quantity`       | text   | ha       |
| `images`         | file[] | ha (1–5) |

Misol `description`:

```json
{"ops":[{"insert":"Mahsulot tavsifi\n"}]}
```

Response `201`: mahsulot obyekti (`status: pending`, `code` avtomatik).

---

## 2. Ro'yxat

**GET** `/ishlabchiqaruvchi/products?status=pending&limit=20&offset=0`

Faqat o'z mahsulotlari. `status` ixtiyoriy.

---

## 3. Bitta mahsulot

**GET** `/ishlabchiqaruvchi/products/{id}`

---

## 4. Yangilash

**PUT** `/ishlabchiqaruvchi/products/{id}`

`multipart/form-data` (rasm bilan) yoki `application/json` (rasmsiz).

Rasm yuborilmasa eski rasmlar saqlanadi. Yangilashdan keyin status yana
`pending` bo'ladi (admin qayta ko'radi), `rejection_note` tozalanadi.

---

## 5. Qayta yuborish (rejected → pending)

**POST** `/ishlabchiqaruvchi/products/{id}/resubmit`

Faqat `rejected` holatdagi mahsulot uchun. Body shart emas.

Response `200`: `status: pending`.

---

## 6. O'chirish

**DELETE** `/ishlabchiqaruvchi/products/{id}`

Faqat `pending` yoki `rejected` mahsulotni o'chirish mumkin.
`approved` ni o'chirib bo'lmaydi.

Response `204`.

---

## Xato formati

```json
{
  "code": "NOTOGRI_SOROV",
  "message": "Kamida 1 ta rasm yuklash shart",
  "field": "images"
}
```

Rasmlar URL: `http://localhost:8080/uploads/products/...`
