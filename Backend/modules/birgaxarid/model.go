// Package birgaxarid — Birga Xarid (jamoaviy xarid) moduli.
// Ma'lumotlar alohida PostgreSQL bazasida (birga_xarid) saqlanadi.
// Admin autentifikatsiyasi My Diller JWT orqali.
package birgaxarid

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("yozuv topilmadi")
	ErrNameTaken  = errors.New("bunday nom band")
	ErrPhoneTaken = errors.New("bu telefon raqami band")
	ErrValidation = errors.New("validatsiya xatosi")
	ErrConflict   = errors.New("konflikt")
)

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string { return e.Message }
func (e *ValidationError) Unwrap() error { return ErrValidation }

func validationError(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

// --- Category ---

type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

func (i CategoryInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Kategoriya nomi kiritilishi shart")
	}
	icon := strings.TrimSpace(i.Icon)
	if icon == "" {
		return validationError("icon", "Icon tanlanishi shart")
	}
	for _, r := range icon {
		ok := (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if !ok {
			return validationError("icon", "Icon nomi noto'g'ri")
		}
	}
	return nil
}

// --- Subcategory ---

type Subcategory struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SubcategoryInput struct {
	CategoryID  int64  `json:"category_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (i SubcategoryInput) Validate() error {
	if i.CategoryID <= 0 {
		return validationError("category_id", "Kategoriya tanlanishi shart")
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Subkategoriya nomi kiritilishi shart")
	}
	return nil
}

// --- Product ---

type Product struct {
	ID            int64     `json:"id"`
	CategoryID    int64     `json:"category_id"`
	SubcategoryID *int64    `json:"subcategory_id,omitempty"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Unit          string    `json:"unit"`
	Price         int64     `json:"price"`
	Stock         int       `json:"stock"`
	PhotoURL      string    `json:"photo_url"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ProductInput struct {
	CategoryID    int64  `json:"category_id"`
	SubcategoryID *int64 `json:"subcategory_id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Unit          string `json:"unit"`
	Price         int64  `json:"price"`
	Stock         int    `json:"stock"`
	PhotoURL      string `json:"photo_url"`
	IsActive      *bool  `json:"is_active"`
}

func (i ProductInput) Validate() error {
	if i.CategoryID <= 0 {
		return validationError("category_id", "Kategoriya tanlanishi shart")
	}
	if i.SubcategoryID == nil || *i.SubcategoryID <= 0 {
		return validationError("subcategory_id", "Subkategoriya tanlanishi shart")
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Mahsulot nomi kiritilishi shart")
	}
	unit := strings.ToLower(strings.TrimSpace(i.Unit))
	if unit == "" {
		unit = "dona"
	}
	switch unit {
	case "dona", "kg", "litr":
	default:
		return validationError("unit", "Birlik faqat dona, kg yoki litr bo'lishi mumkin")
	}
	if i.Price < 0 {
		return validationError("price", "Narx manfiy bo'lishi mumkin emas")
	}
	if i.Stock < 0 {
		return validationError("stock", "Ombor miqdori manfiy bo'lishi mumkin emas")
	}
	return nil
}

func (i ProductInput) ValidateCreate() error {
	if err := i.Validate(); err != nil {
		return err
	}
	if strings.TrimSpace(i.PhotoURL) == "" {
		return validationError("photo", "Mahsulot rasmi yuklanishi shart")
	}
	return nil
}

// --- GroupBuy ---

type GroupBuyItem struct {
	ID          int64  `json:"id"`
	GroupBuyID  int64  `json:"group_buy_id"`
	ProductID   int64  `json:"product_id"`
	Quantity    int    `json:"quantity"`
	ProductName string `json:"product_name,omitempty"`
	PhotoURL    string `json:"photo_url,omitempty"`
}

type GroupBuy struct {
	ID             int64          `json:"id"`
	Kind           string         `json:"kind"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	ProductID      *int64         `json:"product_id,omitempty"`
	Price          int64          `json:"price"`
	MinVolume      int            `json:"min_volume"`
	CurrentVolume  int            `json:"current_volume"`
	Stock          int            `json:"stock"`
	PhotoURLs      []string       `json:"photo_urls"`
	Status         string         `json:"status"`
	Items          []GroupBuyItem `json:"items,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type GroupBuyItemInput struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type GroupBuyInput struct {
	Kind        string              `json:"kind"`
	Title       string              `json:"title"`
	Description string              `json:"description"`
	ProductID   *int64              `json:"product_id"`
	Price       int64               `json:"price"`
	MinVolume   int                 `json:"min_volume"`
	Stock       int                 `json:"stock"`
	PhotoURLs   []string            `json:"photo_urls"`
	Items       []GroupBuyItemInput `json:"items"`
}

func (i GroupBuyInput) Validate() error {
	kind := strings.TrimSpace(i.Kind)
	if kind == "" {
		kind = "product"
	}
	if kind != "product" && kind != "combo" {
		return validationError("kind", "Yig'im turi product yoki combo bo'lishi kerak")
	}
	if strings.TrimSpace(i.Title) == "" {
		return validationError("title", "Yig'im nomi kiritilishi shart")
	}
	if i.Price < 0 {
		return validationError("price", "Narx manfiy bo'lishi mumkin emas")
	}
	if i.MinVolume < 1 {
		return validationError("min_volume", "Maqsad (buyurtma) kamida 1 bo'lishi kerak")
	}
	if i.Stock < 0 {
		return validationError("stock", "Ombor manfiy bo'lishi mumkin emas")
	}
	if kind == "product" && (i.ProductID == nil || *i.ProductID <= 0) {
		return validationError("product_id", "Mahsulot tanlanishi shart")
	}
	if kind == "combo" && len(i.Items) < 2 {
		return validationError("items", "Combo kamida 2 ta mahsulotdan iborat bo'lishi kerak")
	}
	if kind == "combo" {
		seen := make(map[int64]struct{}, len(i.Items))
		for _, item := range i.Items {
			if item.ProductID <= 0 {
				return validationError("items", "Combo mahsulotlari tanlanishi shart")
			}
			if _, ok := seen[item.ProductID]; ok {
				return validationError("items", "Combo da bir xil mahsulotni ikki marta tanlab bo'lmaydi")
			}
			seen[item.ProductID] = struct{}{}
		}
	}
	return nil
}

func (i GroupBuyInput) ValidateCreate() error {
	if err := i.Validate(); err != nil {
		return err
	}
	if len(i.PhotoURLs) < 1 {
		return validationError("photos", "Kamida 1 ta rasm yuklanishi shart")
	}
	if len(i.PhotoURLs) > 5 {
		return validationError("photos", "Ko'pi bilan 5 ta rasm yuklash mumkin")
	}
	return nil
}

type GroupBuyStatusInput struct {
	Status string `json:"status"`
}

func (i GroupBuyStatusInput) Validate() error {
	switch strings.TrimSpace(i.Status) {
	case "open", "closed", "in_fulfillment", "completed", "cancelled":
		return nil
	default:
		return validationError("status", "Status noto'g'ri")
	}
}

// --- Customer ---

type Customer struct {
	ID               int64     `json:"id"`
	Phone            string    `json:"phone"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	BirthDate        *string   `json:"birth_date,omitempty"`
	RegionName       string    `json:"region_name"`
	CityName         string    `json:"city_name"`
	MfyName          string    `json:"mfy_name"`
	Address          string    `json:"address"`
	Lat              *float64  `json:"lat,omitempty"`
	Lng              *float64  `json:"lng,omitempty"`
	ProfileCompleted bool      `json:"profile_completed"`
	IsBlocked        bool      `json:"is_blocked"`
	BlockedReason    string    `json:"blocked_reason"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type CustomerInput struct {
	Phone      string   `json:"phone"`
	FirstName  string   `json:"first_name"`
	LastName   string   `json:"last_name"`
	BirthDate  string   `json:"birth_date"`
	RegionName string   `json:"region_name"`
	CityName   string   `json:"city_name"`
	MfyName    string   `json:"mfy_name"`
	Address    string   `json:"address"`
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
}

func (i CustomerInput) Validate() error {
	if strings.TrimSpace(i.Phone) == "" {
		return validationError("phone", "Telefon raqami kiritilishi shart")
	}
	return nil
}

type BlockInput struct {
	Reason string `json:"reason"`
}

type AuthStartInput struct {
	Phone string `json:"phone"`
}

type AuthStartResult struct {
	Token    string   `json:"token"`
	Customer Customer `json:"customer"`
	IsNew    bool     `json:"is_new"`
}

type ProfileInput struct {
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	BirthDate  string `json:"birth_date"`
	RegionName string `json:"region_name"`
	CityName   string `json:"city_name"`
	MfyName    string `json:"mfy_name"`
	Address    string `json:"address"`
}

func (i ProfileInput) Validate() error {
	if strings.TrimSpace(i.FirstName) == "" {
		return validationError("first_name", "Ism kiritilishi shart")
	}
	if strings.TrimSpace(i.LastName) == "" {
		return validationError("last_name", "Familiya kiritilishi shart")
	}
	if strings.TrimSpace(i.BirthDate) == "" {
		return validationError("birth_date", "Tug'ilgan sana kiritilishi shart")
	}
	if strings.TrimSpace(i.RegionName) == "" {
		return validationError("region_name", "Viloyat tanlanishi shart")
	}
	if strings.TrimSpace(i.CityName) == "" {
		return validationError("city_name", "Tuman tanlanishi shart")
	}
	if strings.TrimSpace(i.MfyName) == "" {
		return validationError("mfy_name", "MFY tanlanishi shart")
	}
	return nil
}

type CartItem struct {
	ID          int64     `json:"id"`
	CustomerID  int64     `json:"customer_id"`
	GroupBuyID  int64     `json:"group_buy_id"`
	Quantity    int       `json:"quantity"`
	Title       string    `json:"title"`
	Price       int64     `json:"price"`
	PhotoURL    string    `json:"photo_url"`
	Status      string    `json:"status"`
	MaxQuantity int       `json:"max_quantity"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CartItemInput struct {
	GroupBuyID int64 `json:"group_buy_id"`
	Quantity   int   `json:"quantity"`
	Add        bool  `json:"add"`
}

func (i CartItemInput) Validate() error {
	if i.GroupBuyID <= 0 {
		return validationError("group_buy_id", "Yig'im tanlanishi shart")
	}
	if i.Quantity < 1 && !i.Add {
		return validationError("quantity", "Miqdor kamida 1 bo'lishi kerak")
	}
	return nil
}

type Order struct {
	ID            int64     `json:"id"`
	CustomerID    int64     `json:"customer_id"`
	GroupBuyID    int64     `json:"group_buy_id"`
	Quantity      int       `json:"quantity"`
	UnitPrice     int64     `json:"unit_price"`
	TotalAmount   int64     `json:"total_amount"`
	Status        string    `json:"status"`
	PickupCode    string    `json:"pickup_code,omitempty"`
	CourierID     *int64    `json:"courier_id,omitempty"`
	TitleSnapshot string    `json:"title_snapshot"`
	PhotoSnapshot string    `json:"photo_snapshot"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// OrderView admin / kuryer uchun mijoz ma'lumotlari bilan.
type OrderView struct {
	Order
	CustomerPhone string         `json:"customer_phone"`
	CustomerName  string         `json:"customer_name"`
	RegionName    string         `json:"region_name"`
	CityName      string         `json:"city_name"`
	MfyName       string         `json:"mfy_name"`
	Address       string         `json:"address"`
	Items         []GroupBuyItem `json:"items,omitempty"`
}

type OrderCreate struct {
	CustomerID    int64
	GroupBuyID    int64
	Quantity      int
	UnitPrice     int64
	TotalAmount   int64
	TitleSnapshot string
	PhotoSnapshot string
	PickupCode    string
}

type DeliverInput struct {
	Code string `json:"code"`
}

func (i DeliverInput) Validate() error {
	digits := strings.TrimSpace(i.Code)
	if len(digits) != 6 {
		return validationError("code", "Tasdiqlash kodi 6 ta raqamdan iborat bo'lishi kerak")
	}
	for _, r := range digits {
		if r < '0' || r > '9' {
			return validationError("code", "Tasdiqlash kodi faqat raqamlardan iborat bo'lishi kerak")
		}
	}
	return nil
}

type CheckoutInput struct {
	GroupBuyID *int64 `json:"group_buy_id"`
	Quantity   int    `json:"quantity"`
}

// Settings — Birga Xarid platforma sozlamalari.
type Settings struct {
	ID                 int64     `json:"id"`
	MinOrderAmount     int64     `json:"min_order_amount"`
	CourierFeeMode     string    `json:"courier_fee_mode"`
	CourierFeePercent  float64   `json:"courier_fee_percent"`
	CourierFeeFixed    int64     `json:"courier_fee_fixed"`
	KuratorFeeMode     string    `json:"kurator_fee_mode"`
	KuratorFeePercent  float64   `json:"kurator_fee_percent"`
	KuratorFeeFixed    int64     `json:"kurator_fee_fixed"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type SettingsInput struct {
	MinOrderAmount    int64   `json:"min_order_amount"`
	CourierFeeMode    string  `json:"courier_fee_mode"`
	CourierFeePercent float64 `json:"courier_fee_percent"`
	CourierFeeFixed   int64   `json:"courier_fee_fixed"`
	KuratorFeeMode    string  `json:"kurator_fee_mode"`
	KuratorFeePercent float64 `json:"kurator_fee_percent"`
	KuratorFeeFixed   int64   `json:"kurator_fee_fixed"`
}

func (i SettingsInput) Validate() error {
	if i.MinOrderAmount < 0 {
		return validationError("min_order_amount", "Minimal summa manfiy bo'lishi mumkin emas")
	}
	courierMode := strings.TrimSpace(i.CourierFeeMode)
	if courierMode == "" {
		courierMode = "percent"
	}
	kuratorMode := strings.TrimSpace(i.KuratorFeeMode)
	if kuratorMode == "" {
		kuratorMode = "percent"
	}
	if courierMode != "percent" && courierMode != "fixed" {
		return validationError("courier_fee_mode", "Kuryer to'lovi turi percent yoki fixed bo'lishi kerak")
	}
	if kuratorMode != "percent" && kuratorMode != "fixed" {
		return validationError("kurator_fee_mode", "Kurator to'lovi turi percent yoki fixed bo'lishi kerak")
	}
	if i.CourierFeePercent < 0 || i.CourierFeePercent > 100 {
		return validationError("courier_fee_percent", "Foiz 0–100 oralig'ida bo'lishi kerak")
	}
	if i.KuratorFeePercent < 0 || i.KuratorFeePercent > 100 {
		return validationError("kurator_fee_percent", "Foiz 0–100 oralig'ida bo'lishi kerak")
	}
	if i.CourierFeeFixed < 0 {
		return validationError("courier_fee_fixed", "Summa manfiy bo'lishi mumkin emas")
	}
	if i.KuratorFeeFixed < 0 {
		return validationError("kurator_fee_fixed", "Summa manfiy bo'lishi mumkin emas")
	}
	return nil
}

// FinanceAccrual — topshirilgan buyurtmadan kuryer/kurator ulushi.
type FinanceAccrual struct {
	ID            int64      `json:"id"`
	OrderID       int64      `json:"order_id"`
	OrderAmount   int64      `json:"order_amount"`
	CourierID     *int64     `json:"courier_id,omitempty"`
	CourierAmount int64      `json:"courier_amount"`
	CourierPaid   bool       `json:"courier_paid"`
	CourierPaidAt *time.Time `json:"courier_paid_at,omitempty"`
	KuratorAmount int64      `json:"kurator_amount"`
	KuratorPaid   bool       `json:"kurator_paid"`
	KuratorPaidAt *time.Time `json:"kurator_paid_at,omitempty"`
	RegionName    string     `json:"region_name"`
	CityName      string     `json:"city_name"`
	MfyName       string     `json:"mfy_name"`
	CreatedAt     time.Time  `json:"created_at"`
}

type FinanceStats struct {
	IssuedOrders      int   `json:"issued_orders"`
	GrossVolume       int64 `json:"gross_volume"`
	CourierAccrued    int64 `json:"courier_accrued"`
	CourierPaid       int64 `json:"courier_paid"`
	CourierPending    int64 `json:"courier_pending"`
	KuratorAccrued    int64 `json:"kurator_accrued"`
	KuratorPaid       int64 `json:"kurator_paid"`
	KuratorPending    int64 `json:"kurator_pending"`
	PlatformEstimate  int64 `json:"platform_estimate"`
}

type FinancePayInput struct {
	IDs []int64 `json:"ids"`
}

func (i FinancePayInput) Validate() error {
	if len(i.IDs) == 0 {
		return validationError("ids", "Kamida 1 ta yozuv tanlanishi shart")
	}
	return nil
}


