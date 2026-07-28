package product

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("mahsulot topilmadi")
	ErrCodeTaken  = errors.New("bu mahsulot kodi band")
	ErrForbidden  = errors.New("bu mahsulotga ruxsatingiz yo'q")
	ErrValidation = errors.New("validatsiya xatosi")
	ErrBadStatus  = errors.New("mahsulot holati bu amal uchun mos emas")
	ErrCategory   = errors.New("kategoriya yoki subkategoriya noto'g'ri")
	ErrInUse      = errors.New("bu mahsulot buyurtmalarda ishlatilgan, o'chirib bo'lmaydi")
)

const (
	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusRejected = "rejected"
)

const (
	PaymentTermPrepay100    = "prepay_100"
	PaymentTermDeferred     = "deferred"
	PaymentTermPodZakaz5050 = "pod_zakaz_50_50"
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

type Product struct {
	ID                  int64           `json:"id"`
	Code                string          `json:"code"`
	IshlabchiqaruvchiID int64           `json:"ishlabchiqaruvchi_id"`
	Name                string          `json:"name"`
	City                string          `json:"city"`
	Description         json.RawMessage `json:"description"`
	CategoryID          int64           `json:"category_id"`
	SubcategoryID       int64           `json:"subcategory_id"`
	Price               float64         `json:"price"`
	Quantity            int             `json:"quantity"`
	MOQ                 int             `json:"moq"`
	PaymentTerm         string          `json:"payment_term"`
	PaymentDays         int             `json:"payment_days"`
	Specs               json.RawMessage `json:"specs"`
	Images              []string        `json:"images"`
	Status              string          `json:"status"`
	RejectionNote       string          `json:"rejection_note"`
	ReviewedBy          *int64          `json:"reviewed_by,omitempty"`
	ReviewedAt          *time.Time      `json:"reviewed_at,omitempty"`
	DeletedAt           *time.Time      `json:"deleted_at,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type CreateInput struct {
	Code          string
	Name          string
	City          string
	Description   json.RawMessage
	CategoryID    int64
	SubcategoryID int64
	Price         float64
	Quantity      int
	MOQ           int
	PaymentTerm   string
	PaymentDays   int
	Specs         json.RawMessage
	Images        []string
}

func (i CreateInput) Validate() error {
	if err := ValidateCode(i.Code); err != nil {
		return err
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Mahsulot nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.City) == "" {
		return validationError("city", "Shahar kiritilishi shart")
	}
	if err := validateDelta(i.Description); err != nil {
		return err
	}
	if i.CategoryID <= 0 {
		return validationError("category_id", "category_id musbat butun son bo'lishi kerak")
	}
	if i.SubcategoryID <= 0 {
		return validationError("subcategory_id", "subcategory_id musbat butun son bo'lishi kerak")
	}
	if i.Price < 0 {
		return validationError("price", "Narx manfiy bo'lishi mumkin emas")
	}
	if i.Quantity < 0 {
		return validationError("quantity", "Soni manfiy bo'lishi mumkin emas")
	}
	if err := validateMOQ(i.MOQ); err != nil {
		return err
	}
	if err := validatePaymentTerm(i.PaymentTerm); err != nil {
		return err
	}
	if err := validatePaymentDays(i.PaymentTerm, i.PaymentDays); err != nil {
		return err
	}
	if err := validateSpecs(i.Specs); err != nil {
		return err
	}
	if len(i.Images) < 1 {
		return validationError("images", "Kamida 1 ta rasm yuklash shart")
	}
	if len(i.Images) > 5 {
		return validationError("images", "Ko'pi bilan 5 ta rasm yuklash mumkin")
	}
	return nil
}

type UpdateInput struct {
	Code          string
	Name          string
	City          string
	Description   json.RawMessage
	CategoryID    int64
	SubcategoryID int64
	Price         float64
	Quantity      int
	MOQ           int
	PaymentTerm   string
	PaymentDays   int
	Specs         json.RawMessage
	Images        []string // bo'sh bo'lsa eski rasmlar saqlanadi
	HasNewImages  bool
}

func (i UpdateInput) Validate() error {
	if err := ValidateCode(i.Code); err != nil {
		return err
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Mahsulot nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.City) == "" {
		return validationError("city", "Shahar kiritilishi shart")
	}
	if err := validateDelta(i.Description); err != nil {
		return err
	}
	if i.CategoryID <= 0 {
		return validationError("category_id", "category_id musbat butun son bo'lishi kerak")
	}
	if i.SubcategoryID <= 0 {
		return validationError("subcategory_id", "subcategory_id musbat butun son bo'lishi kerak")
	}
	if i.Price < 0 {
		return validationError("price", "Narx manfiy bo'lishi mumkin emas")
	}
	if i.Quantity < 0 {
		return validationError("quantity", "Soni manfiy bo'lishi mumkin emas")
	}
	if err := validateMOQ(i.MOQ); err != nil {
		return err
	}
	if err := validatePaymentTerm(i.PaymentTerm); err != nil {
		return err
	}
	if err := validatePaymentDays(i.PaymentTerm, i.PaymentDays); err != nil {
		return err
	}
	if err := validateSpecs(i.Specs); err != nil {
		return err
	}
	if i.HasNewImages {
		if len(i.Images) < 1 {
			return validationError("images", "Kamida 1 ta rasm yuklash shart")
		}
		if len(i.Images) > 5 {
			return validationError("images", "Ko'pi bilan 5 ta rasm yuklash mumkin")
		}
	}
	return nil
}

type RejectInput struct {
	Note string `json:"note"`
}

func (i RejectInput) Validate() error {
	if strings.TrimSpace(i.Note) == "" {
		return validationError("note", "Bekor qilish sababi kiritilishi shart")
	}
	return nil
}

func validateMOQ(moq int) error {
	if moq < 1 {
		return validationError("moq", "moq kamida 1 bo'lishi kerak")
	}
	return nil
}

func validatePaymentTerm(term string) error {
	switch term {
	case PaymentTermPrepay100, PaymentTermDeferred, PaymentTermPodZakaz5050:
		return nil
	default:
		return validationError("payment_term", "payment_term prepay_100, deferred yoki pod_zakaz_50_50 bo'lishi kerak")
	}
}

func validatePaymentDays(term string, days int) error {
	switch term {
	case PaymentTermDeferred:
		if days < 1 || days > 30 {
			return validationError("payment_days", "Kechiktirilgan to'lovda payment_days 1 dan 30 gacha bo'lishi kerak")
		}
	default:
		if days != 0 {
			return validationError("payment_days", "Ushbu to'lov turi uchun payment_days 0 bo'lishi kerak")
		}
	}
	return nil
}

func validateSpecs(raw json.RawMessage) error {
	if len(raw) == 0 {
		return nil
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return validationError("specs", "specs JSON obyekt ({}) bo'lishi kerak")
	}
	return nil
}

func specsOrDefault(raw json.RawMessage) []byte {
	if len(raw) == 0 {
		return []byte("{}")
	}
	return []byte(raw)
}

func validateDelta(raw json.RawMessage) error {
	if len(raw) == 0 {
		return validationError("description", "Tavsif (Delta) kiritilishi shart")
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return validationError("description", "Tavsif Delta JSON formatida bo'lishi kerak")
	}

	ops, ok := payload["ops"]
	if !ok {
		return validationError("description", "Delta formatida ops maydoni bo'lishi shart")
	}
	if _, ok := ops.([]any); !ok {
		return validationError("description", "Delta ops massiv bo'lishi kerak")
	}
	return nil
}

func ValidateCode(code string) error {
	if strings.TrimSpace(code) == "" {
		return validationError("code", "Mahsulot kodi kiritilishi shart")
	}
	if len(strings.TrimSpace(code)) > 64 {
		return validationError("code", "Mahsulot kodi 64 belgidan oshmasligi kerak")
	}
	return nil
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

func parseFloatField(raw, field string) (float64, error) {
	if strings.TrimSpace(raw) == "" {
		return 0, validationError(field, field+" kiritilishi shart")
	}
	var v float64
	if _, err := fmt.Sscanf(raw, "%f", &v); err != nil {
		return 0, validationError(field, field+" son bo'lishi kerak")
	}
	return v, nil
}
