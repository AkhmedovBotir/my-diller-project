// Package kurator — kuratorlarning zavodlardan olinadigan komissiyadan
// ulush (daromad) va kartaga pul yechish so'rovlarini boshqarish moduli.
package kurator

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound            = errors.New("to'lov so'rovi topilmadi")
	ErrValidation          = errors.New("validatsiya xatosi")
	ErrBadStatus           = errors.New("so'rov holati bu amal uchun mos emas")
	ErrInsufficientBalance = errors.New("mavjud balans yetarli emas")
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

// To'lov so'rovi holatlari.
const (
	TolovStatusPending  = "pending"
	TolovStatusPaid     = "paid"
	TolovStatusRejected = "rejected"
)

// Daromad — kurator_daromadlar jadvaliga mos model.
type Daromad struct {
	ID          int64     `json:"id"`
	KuratorID   int64     `json:"kurator_id"`
	BuyurtmaID  int64     `json:"buyurtma_id"`
	OrderAmount float64   `json:"order_amount"`
	Percent     float64   `json:"percent"`
	Amount      float64   `json:"amount"`
	CreatedAt   time.Time `json:"created_at"`
}

// TolovSorovi — kurator_tolov_sorovlari jadvaliga mos model.
type TolovSorovi struct {
	ID          int64      `json:"id"`
	KuratorID   int64      `json:"kurator_id"`
	Amount      float64    `json:"amount"`
	CardNumber  string     `json:"card_number"`
	CardHolder  string     `json:"card_holder"`
	Note        string     `json:"note"`
	Status      string     `json:"status"`
	AdminNote   string     `json:"admin_note"`
	ProcessedBy *int64     `json:"processed_by,omitempty"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// DaromadSummary — GET /kurator/daromad javobi.
type DaromadSummary struct {
	Balance               float64   `json:"balance"`
	TotalEarned           float64   `json:"total_earned"`
	TotalWithdrawnPending float64   `json:"total_withdrawn_pending"`
	Items                 []Daromad `json:"items"`
}

// KomissiyaItem — kurator o'z zavodlarining komissiyalarini ko'rishi uchun.
type KomissiyaItem struct {
	ID                  int64      `json:"id"`
	BuyurtmaID          int64      `json:"buyurtma_id"`
	IshlabchiqaruvchiID int64      `json:"ishlabchiqaruvchi_id"`
	CompanyName         string     `json:"company_name"`
	OrderAmount         float64    `json:"order_amount"`
	Percent             float64    `json:"percent"`
	Amount              float64    `json:"amount"`
	Status              string     `json:"status"`
	PaidAt              *time.Time `json:"paid_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
}

type CreateTolovSorovInput struct {
	Amount     float64 `json:"amount"`
	CardNumber string  `json:"card_number"`
	CardHolder string  `json:"card_holder"`
	Note       string  `json:"note,omitempty"`
}

func (i CreateTolovSorovInput) Validate() error {
	if i.Amount <= 0 {
		return validationError("amount", "Summa musbat bo'lishi kerak")
	}
	if strings.TrimSpace(i.CardNumber) == "" {
		return validationError("card_number", "Karta raqami kiritilishi shart")
	}
	if strings.TrimSpace(i.CardHolder) == "" {
		return validationError("card_holder", "Karta egasining ismi kiritilishi shart")
	}
	return nil
}

// RejectTolovSorovInput admin tomonidan to'lov so'rovini rad etishda
// ixtiyoriy izoh.
type RejectTolovSorovInput struct {
	AdminNote string `json:"admin_note,omitempty"`
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

func validTolovStatusFilter(status string) bool {
	switch status {
	case "", TolovStatusPending, TolovStatusPaid, TolovStatusRejected:
		return true
	default:
		return false
	}
}
