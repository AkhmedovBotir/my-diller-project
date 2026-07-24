package category

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("kategoriya topilmadi")
	ErrNameTaken  = errors.New("bu kategoriya nomi band")
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

type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateCategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (i CreateCategoryInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Kategoriya nomi kiritilishi shart")
	}
	return nil
}

type UpdateCategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (i UpdateCategoryInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Kategoriya nomi kiritilishi shart")
	}
	return nil
}
