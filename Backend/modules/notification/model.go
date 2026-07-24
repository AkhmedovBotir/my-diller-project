// Package notification — tizim ichidagi bildirishnomalar moduli.
package notification

import (
	"errors"
	"time"
)

var (
	ErrNotFound   = errors.New("bildirishnoma topilmadi")
	ErrForbidden  = errors.New("bu bildirishnomaga ruxsatingiz yo'q")
	ErrValidation = errors.New("validatsiya xatosi")
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

// Notification — notifications jadvaliga mos model.
// recipient_type qiymatlari auth.Subject* konstantalari bilan mos keladi
// (admin, ishlabchiqaruvchi, xaridor, dostavka).
type Notification struct {
	ID            int64     `json:"id"`
	RecipientType string    `json:"recipient_type"`
	RecipientID   int64     `json:"recipient_id"`
	Title         string    `json:"title"`
	Body          string    `json:"body"`
	Link          string    `json:"link"`
	IsRead        bool      `json:"is_read"`
	CreatedAt     time.Time `json:"created_at"`
}
