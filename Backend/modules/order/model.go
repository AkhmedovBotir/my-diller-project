// Package order — buyurtmalar moduli: xaridor, ishlab chiqaruvchi, dostavka,
// kurator va bosh admin uchun buyurtma va komissiya boshqaruvi.
package order

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound            = errors.New("buyurtma topilmadi")
	ErrForbidden           = errors.New("bu buyurtmaga ruxsatingiz yo'q")
	ErrValidation          = errors.New("validatsiya xatosi")
	ErrBadStatus           = errors.New("buyurtma holati bu amal uchun mos emas")
	ErrProductNotFound     = errors.New("tanlangan mahsulotlardan biri topilmadi")
	ErrProductNotApproved  = errors.New("barcha mahsulotlar tasdiqlangan (approved) bo'lishi kerak")
	ErrMixedManufacturers  = errors.New("barcha mahsulotlar bitta ishlab chiqaruvchiga tegishli bo'lishi kerak")
	ErrMixedPaymentTerms   = errors.New("tanlangan mahsulotlarning to'lov shartlari bir xil bo'lishi kerak")
	ErrQuantityBelowMOQ    = errors.New("buyurtma miqdori mahsulotning minimal buyurtma miqdoridan (MOQ) kam")
	ErrInsufficientStock   = errors.New("mahsulot omborida yetarli miqdor yo'q")
	ErrXaridorBlocked      = errors.New("xaridor bloklangan, buyurtma berib bo'lmaydi")
	ErrDeadlineNotPassed   = errors.New("to'lov muddati hali tugamagan")
	ErrAlreadyPaid         = errors.New("buyurtma bo'yicha to'lov allaqachon amalga oshirilgan")
	ErrNoDostavka          = errors.New("tizimda dostavka kompaniyasi ro'yxatdan o'tmagan")
	ErrInsufficientReserve = errors.New("zaxira balansda mablag' yetarli emas")
	ErrReceiptRequired     = errors.New("avval to'lov kvitansiyasini yuklash kerak")
	ErrCommissionNotFound  = errors.New("komissiya topilmadi")
	ErrDebtNotFound        = errors.New("platforma qarzi topilmadi")
	ErrDebtBadStatus       = errors.New("qarz holati bu amal uchun mos emas")
)

// ErrAdvanceRequired — ishlab chiqaruvchi buyurtmani qabul qilishdan oldin
// xaridorning avans to'lovi tasdiqlanishi kerak bo'lganda qaytariladi.
// ErrBadStatus'ni o'raydi, shuning uchun mavjud xatolik klassifikatsiyasi
// (HTTP 409) o'zgarishsiz ishlaydi.
var ErrAdvanceRequired = fmt.Errorf("%w: avval xaridor tomonidan avans to'lovi tasdiqlanishi va ishlab chiqaruvchi tomonidan tasdiqlanishi kerak", ErrBadStatus)

// Buyurtma holatlari (TZ bo'yicha).
const (
	StatusYangi                     = "yangi"
	StatusQabulQilindi              = "qabul_qilindi"
	StatusLogistikagaUzatildi       = "logistikaga_uzatildi"
	StatusYolda                     = "yolda"
	StatusYetkazildiTolovKutilmoqda = "yetkazildi_tolov_kutilmoqda"
	StatusYakunlandi                = "yakunlandi"
	StatusForsMajor                 = "fors_major"
	StatusKafolatBilanYopildi       = "kafolat_bilan_yopildi"
)

// To'lov shartlari (products/buyurtmalar jadvallari bilan mos).
const (
	PaymentTermPrepay100    = "prepay_100"
	PaymentTermDeferred     = "deferred"
	PaymentTermPodZakaz5050 = "pod_zakaz_50_50"
)

// Komissiya holatlari.
const (
	CommissionStatusPending = "pending"
	CommissionStatusPaid    = "paid"
	CommissionStatusWaived  = "waived"
)

// To'lov bosqichlari (payment_phase) — avans va yakuniy to'lov jarayonini
// buyurtma holatidan mustaqil kuzatish uchun.
const (
	PaymentPhaseNone            = "none"
	PaymentPhaseAwaitingAdvance = "awaiting_advance"
	PaymentPhaseAdvanceDone     = "advance_done"
	PaymentPhaseAwaitingFinal   = "awaiting_final"
	PaymentPhasePaid            = "paid"
)

// Platforma qarzi holatlari.
const (
	DebtStatusOpen       = "open"
	DebtStatusCollected  = "collected"
	DebtStatusWrittenOff = "written_off"
)

// roleKurator modules/admin.TypeKurator qiymati bilan mos keladi. Import
// tsiklidan qochish uchun bu yerda literal sifatida takrorlanadi.
const roleKurator = "kurator"

// roleGeneral modules/admin.TypeGeneral qiymati bilan mos keladi.
const roleGeneral = "general"

const productStatusApproved = "approved"

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string { return e.Message }
func (e *ValidationError) Unwrap() error { return ErrValidation }

func validationError(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

// Order — buyurtmalar jadvaliga mos model.
type Order struct {
	ID                  int64      `json:"id"`
	Number              string     `json:"number"`
	XaridorID           int64      `json:"xaridor_id"`
	IshlabchiqaruvchiID int64      `json:"ishlabchiqaruvchi_id"`
	DostavkaID          *int64     `json:"dostavka_id"`
	KuratorID           *int64     `json:"kurator_id"`
	Status              string     `json:"status"`
	PaymentTerm         string     `json:"payment_term"`
	PaymentDays         int        `json:"payment_days"`
	TotalAmount         float64    `json:"total_amount"`
	PointAAddress       string     `json:"point_a_address"`
	PointALat           *float64   `json:"point_a_lat"`
	PointALng           *float64   `json:"point_a_lng"`
	PointBAddress       string     `json:"point_b_address"`
	PointBLat           *float64   `json:"point_b_lat"`
	PointBLng           *float64   `json:"point_b_lng"`
	ContractHTML        string     `json:"contract_html"`
	InvoiceHTML         string     `json:"invoice_html"`
	InvoiceNumber       string     `json:"invoice_number"`
	PaymentReceiptURL   string     `json:"payment_receipt_url"`
	PaymentDeadlineAt   *time.Time `json:"payment_deadline_at,omitempty"`
	PaymentPhase        string     `json:"payment_phase"`
	AdvanceAmount       float64    `json:"advance_amount"`
	AdvanceReceiptURL   string     `json:"advance_receipt_url"`
	AdvanceConfirmedAt  *time.Time `json:"advance_confirmed_at,omitempty"`
	DeadlineWarnedAt    *time.Time `json:"deadline_warned_at,omitempty"`
	AcceptedAt          *time.Time `json:"accepted_at,omitempty"`
	ReadyAt             *time.Time `json:"ready_at,omitempty"`
	PickedUpAt          *time.Time `json:"picked_up_at,omitempty"`
	ShippedAt           *time.Time `json:"shipped_at,omitempty"`
	DeliveredAt         *time.Time `json:"delivered_at,omitempty"`
	BuyerReceivedAt     *time.Time `json:"buyer_received_at,omitempty"`
	PaidAt              *time.Time `json:"paid_at,omitempty"`
	ForceMajeureAt      *time.Time `json:"force_majeure_at,omitempty"`
	ForceMajeureBy      *int64     `json:"force_majeure_by,omitempty"`
	GuaranteePaidAt     *time.Time `json:"guarantee_paid_at,omitempty"`
	GuaranteeBy         *int64     `json:"guarantee_by,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`

	Items []OrderItem `json:"items,omitempty"`
}

// OrderItem — buyurtma_mahsulotlari jadvaliga mos model.
type OrderItem struct {
	ID          int64   `json:"id"`
	BuyurtmaID  int64   `json:"buyurtma_id"`
	ProductID   int64   `json:"product_id"`
	ProductCode string  `json:"product_code"`
	ProductName string  `json:"product_name"`
	UnitPrice   float64 `json:"unit_price"`
	Quantity    int     `json:"quantity"`
	MOQ         int     `json:"moq"`
	LineTotal   float64 `json:"line_total"`
}

// Commission — komissiyalar jadvaliga mos model.
type Commission struct {
	ID                  int64      `json:"id"`
	BuyurtmaID          int64      `json:"buyurtma_id"`
	IshlabchiqaruvchiID int64      `json:"ishlabchiqaruvchi_id"`
	OrderAmount         float64    `json:"order_amount"`
	Percent             float64    `json:"percent"`
	Amount              float64    `json:"amount"`
	Status              string     `json:"status"`
	InvoiceHTML         string     `json:"invoice_html"`
	PaymentReceiptURL   string     `json:"payment_receipt_url"`
	PaidAt              *time.Time `json:"paid_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// PlatformSettings — platform_settings jadvaliga mos model.
type PlatformSettings struct {
	ID                int64     `json:"id"`
	CommissionPercent float64   `json:"commission_percent"`
	FreePromoActive   bool      `json:"free_promo_active"`
	ReserveBalance    float64   `json:"reserve_balance"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// PlatformDebt — platform_debts jadvaliga mos model. Fors-major holatida
// platforma kafolat to'lovini amalga oshirgach, xaridordan platformaga
// qaytariladigan qarzni kuzatish uchun.
type PlatformDebt struct {
	ID         int64     `json:"id"`
	XaridorID  int64     `json:"xaridor_id"`
	BuyurtmaID int64     `json:"buyurtma_id"`
	Amount     float64   `json:"amount"`
	Status     string    `json:"status"`
	Note       string    `json:"note"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// DocumentSummary — kurator uchun buyurtma hujjatlari ro'yxati elementi.
type DocumentSummary struct {
	ID                  int64     `json:"id"`
	Number              string    `json:"number"`
	Status              string    `json:"status"`
	ContractAvailable   bool      `json:"contract_available"`
	InvoiceNumber       string    `json:"invoice_number"`
	PaymentReceiptURL   string    `json:"payment_receipt_url"`
	AdvanceReceiptURL   string    `json:"advance_receipt_url"`
	XaridorID           int64     `json:"xaridor_id"`
	IshlabchiqaruvchiID int64     `json:"ishlabchiqaruvchi_id"`
	CreatedAt           time.Time `json:"created_at"`
}

// ForsMajorAlerts — bosh admin paneli uchun fors-major holatidagi
// buyurtmalar bo'yicha qisqacha xabarnoma.
type ForsMajorAlerts struct {
	Count int     `json:"count"`
	Items []Order `json:"items"`
}

// ---- Kirish (input) turlari ----

type CreateOrderItemInput struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type CreateOrderInput struct {
	Items []CreateOrderItemInput `json:"items"`
	Note  string                 `json:"note,omitempty"`
}

func (i CreateOrderInput) Validate() error {
	if len(i.Items) == 0 {
		return validationError("items", "Kamida 1 ta mahsulot tanlanishi shart")
	}
	for idx, item := range i.Items {
		if item.ProductID <= 0 {
			return validationError(fmt.Sprintf("items[%d].product_id", idx), "product_id musbat butun son bo'lishi kerak")
		}
		if item.Quantity <= 0 {
			return validationError(fmt.Sprintf("items[%d].quantity", idx), "quantity musbat butun son bo'lishi kerak")
		}
	}
	return nil
}

type ReadyInput struct {
	DostavkaID *int64 `json:"dostavka_id,omitempty"`
}

func (i ReadyInput) Validate() error {
	if i.DostavkaID != nil && *i.DostavkaID <= 0 {
		return validationError("dostavka_id", "dostavka_id musbat butun son bo'lishi kerak")
	}
	return nil
}

type UpdatePlatformSettingsInput struct {
	CommissionPercent float64 `json:"commission_percent"`
	FreePromoActive   bool    `json:"free_promo_active"`
	ReserveBalance    float64 `json:"reserve_balance"`
}

func (i UpdatePlatformSettingsInput) Validate() error {
	if i.CommissionPercent < 0 || i.CommissionPercent > 100 {
		return validationError("commission_percent", "commission_percent 0 va 100 oralig'ida bo'lishi kerak")
	}
	if i.ReserveBalance < 0 {
		return validationError("reserve_balance", "reserve_balance manfiy bo'lishi mumkin emas")
	}
	return nil
}

type CollectDebtInput struct {
	Note string `json:"note,omitempty"`
}

func normalizePagination(limit, offset int) (int, int) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func validStatusFilter(status string) bool {
	switch status {
	case "", StatusYangi, StatusQabulQilindi, StatusLogistikagaUzatildi, StatusYolda,
		StatusYetkazildiTolovKutilmoqda, StatusYakunlandi, StatusForsMajor, StatusKafolatBilanYopildi:
		return true
	default:
		return false
	}
}
