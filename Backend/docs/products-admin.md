# Mahsulot API — Admin

Base URL: `http://localhost:8080/api/v1`

Barcha endpointlar **admin JWT token** talab qiladi:

```
Authorization: Bearer <token>
```

## Holatlar

| Status     | Amallar                                              |
|------------|------------------------------------------------------|
| `pending`  | Ko'rish, tasdiqlash, bekor qilish, o'zgartirish, o'chirish |
| `approved` | Ko'rish, o'zgartirish, o'chirish                     |
| `rejected` | Ko'rish, o'zgartirish, o'chirish                     |

Admin mahsulotni o'zgartirganda **qayta tasdiq shart emas** — status
`approved` bo'ladi.

Bekor qilishda `note` majburiy. Ishlab chiqaruvchi keyin qayta yuboradi
(`pending`), admin yana ko'radi.

---

## 1. Ro'yxat

**GET** `/admin/products?status=pending&limit=20&offset=0`

`status` ixtiyoriy: `pending` | `approved` | `rejected`.

Response `200`:

```json
[
  {
    "id": 1,
    "code": "MK9-99U",
    "ishlabchiqaruvchi_id": 3,
    "name": "Smartfon X",
    "description": {"ops":[{"insert":"Tavsif\n"}]},
    "category_id": 1,
    "subcategory_id": 2,
    "price": 2500000,
    "quantity": 10,
    "images": ["http://localhost:8080/uploads/products/..."],
    "status": "pending",
    "rejection_note": "",
    "reviewed_by": null,
    "reviewed_at": null,
    "created_at": "2026-07-24T12:00:00Z",
    "updated_at": "2026-07-24T12:00:00Z"
  }
]
```

---

## 2. Bitta mahsulot

**GET** `/admin/products/{id}`

---

## 3. Tasdiqlash

**POST** `/admin/products/{id}/approve`

Faqat `pending` uchun. Body shart emas.

Response `200`: `status: approved`.

---

## 4. Bekor qilish

**POST** `/admin/products/{id}/reject`

Faqat `pending` uchun.

Request:

```json
{
  "note": "Rasmlar sifati past, qayta yuklang"
}
```

Response `200`: `status: rejected`, `rejection_note` to'ldiriladi.

---

## 5. O'zgartirish

**PUT** `/admin/products/{id}`

`multipart/form-data` yoki `application/json`.

Maydonlar: `name`, `description` (Delta JSON), `category_id`,
`subcategory_id`, `price`, `quantity`, ixtiyoriy `images` (1–5 ta).

Admin o'zgartirganda status `approved` bo'ladi, qayta tasdiq kutilmaydi.

---

## 6. O'chirish

**DELETE** `/admin/products/{id}`

Istalgan holatdagi mahsulotni o'chirish mumkin. Response `204`.

---

## Mahsulot kodi

`code` maydoni `ABC-123` formatida, tizim bo'ylab unikal.
Admin tomonidan o'zgartirilmaydi.

## Xato formati

```json
{
  "code": "TAKRORIY_MALUMOT",
  "message": "Mahsulot holati bu amal uchun mos emas"
}
```
