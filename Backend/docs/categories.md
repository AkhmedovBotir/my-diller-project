# Kategoriya va Subkategoriya API Hujjatlari

Barcha endpointlar `http://localhost:8080/api/v1` prefiksi bilan ishlaydi.
Barcha endpointlar **admin JWT token** talab qiladi:

```
Authorization: Bearer <token>
```

Kategoriya o'chirilganda unga bog'langan subkategoriyalar ham avtomatik o'chadi (`ON DELETE CASCADE`).

---

## 1. Kategoriyalar CRUD

### 1.1 Ro'yxat

**GET** `/categories?limit=20&offset=0`

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Elektronika",
    "description": "Texnika va gadjetlar",
    "created_at": "2026-07-24T12:00:00Z",
    "updated_at": "2026-07-24T12:00:00Z"
  }
]
```

### 1.2 Bitta kategoriya

**GET** `/categories/{id}`

Response `200`: kategoriya obyekti. Xato: `404`.

### 1.3 Yaratish

**POST** `/categories`

Request:

```json
{
  "name": "Elektronika",
  "description": "Texnika va gadjetlar"
}
```

`description` ixtiyoriy (bo'sh string bo'lishi mumkin). `name` majburiy va unikal.

Response `201`: yaratilgan obyekt.

Xatolar: `400`, `401`, `403`, `409` (nom band).

### 1.4 Yangilash

**PUT** `/categories/{id}`

Request:

```json
{
  "name": "Elektronika",
  "description": "Yangilangan tavsif"
}
```

Response `200`: yangilangan obyekt.

### 1.5 O'chirish

**DELETE** `/categories/{id}`

Response `204`. Bog'langan subkategoriyalar ham o'chadi.

---

## 2. Subkategoriyalar CRUD

Subkategoriya o'z `id` si orqali boshqariladi. `category_id` orqali qaysi kategoriyaga tegishli ekanligi belgilanadi.

### 2.1 Ro'yxat

**GET** `/subcategories?limit=20&offset=0`

Ma'lum kategoriyaning subkategoriyalari:

**GET** `/subcategories?category_id=1&limit=20&offset=0`

Response `200`:

```json
[
  {
    "id": 1,
    "category_id": 1,
    "name": "Telefonlar",
    "description": "Smartfonlar",
    "created_at": "2026-07-24T12:00:00Z",
    "updated_at": "2026-07-24T12:00:00Z"
  }
]
```

### 2.2 Bitta subkategoriya

**GET** `/subcategories/{id}`

Response `200`: subkategoriya obyekti. Xato: `404`.

### 2.3 Yaratish

**POST** `/subcategories`

Request:

```json
{
  "category_id": 1,
  "name": "Telefonlar",
  "description": "Smartfonlar"
}
```

`category_id` mavjud kategoriya bo'lishi shart. Bir kategoriyada `name` unikal.

Response `201`: yaratilgan obyekt.

Xatolar: `400` (validatsiya yoki category topilmadi), `401`, `403`, `409`.

### 2.4 Yangilash

**PUT** `/subcategories/{id}`

Request:

```json
{
  "category_id": 1,
  "name": "Telefonlar",
  "description": "Yangilangan tavsif"
}
```

`category_id` ni o'zgartirish orqali subkategoriyani boshqa kategoriyaga ko'chirish mumkin.

Response `200`: yangilangan obyekt.

### 2.5 O'chirish

**DELETE** `/subcategories/{id}`

Response `204`.

---

## Xato formati

```json
{
  "code": "NOTOGRI_SOROV",
  "message": "Kategoriya nomi kiritilishi shart",
  "field": "name"
}
```

## Swagger

Interaktiv hujjatlar: [http://localhost:8080/swagger](http://localhost:8080/swagger)
