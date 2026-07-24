package category

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrSubNotFound  = errors.New("subkategoriya topilmadi")
	ErrSubNameTaken = errors.New("bu subkategoriya nomi shu kategoriyada band")
)

type Subcategory struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateSubcategoryInput struct {
	CategoryID  int64  `json:"category_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (i CreateSubcategoryInput) Validate() error {
	if i.CategoryID <= 0 {
		return validationError("category_id", "category_id musbat butun son bo'lishi kerak")
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Subkategoriya nomi kiritilishi shart")
	}
	return nil
}

type UpdateSubcategoryInput struct {
	CategoryID  int64  `json:"category_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (i UpdateSubcategoryInput) Validate() error {
	if i.CategoryID <= 0 {
		return validationError("category_id", "category_id musbat butun son bo'lishi kerak")
	}
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Subkategoriya nomi kiritilishi shart")
	}
	return nil
}
