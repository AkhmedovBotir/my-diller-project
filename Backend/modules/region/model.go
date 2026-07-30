package region

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("hudud topilmadi")
	ErrValidation = errors.New("validatsiya xatosi")
	ErrConflict   = errors.New("hudud band")
	ErrHasChildren = errors.New("bolalari bor hududni o'chirib bo'lmaydi")
)

const (
	TypeRegion   = "region"
	TypeDistrict = "district"
	TypeMFY      = "mfy"
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

type Region struct {
	ID        int64     `json:"id"`
	MongoOID  string    `json:"mongo_oid,omitempty"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateInput struct {
	ParentID *int64 `json:"parent_id"`
	Name     string `json:"name"`
	Code     string `json:"code"`
	Type     string `json:"type"`
	Status   string `json:"status"`
}

func (i CreateInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Nom kiritilishi shart")
	}
	switch i.Type {
	case TypeRegion, TypeDistrict, TypeMFY:
	default:
		return validationError("type", "type region, district yoki mfy bo'lishi kerak")
	}
	if i.Type == TypeRegion && i.ParentID != nil {
		return validationError("parent_id", "Viloyatning parent bo'lmasligi kerak")
	}
	if i.Type != TypeRegion && (i.ParentID == nil || *i.ParentID <= 0) {
		return validationError("parent_id", "Parent tanlanishi shart")
	}
	return nil
}

type UpdateInput struct {
	ParentID *int64 `json:"parent_id"`
	Name     string `json:"name"`
	Code     string `json:"code"`
	Status   string `json:"status"`
}

func (i UpdateInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return validationError("name", "Nom kiritilishi shart")
	}
	return nil
}

type Labels struct {
	RegionID   int64  `json:"region_id"`
	RegionName string `json:"region_name"`
	DistrictID int64  `json:"district_id"`
	DistrictName string `json:"district_name"`
	MFYID      int64  `json:"mfy_id"`
	MFYName    string `json:"mfy_name"`
	City       string `json:"city"` // sync uchun: tuman nomi
	MFY        string `json:"mfy"`  // sync uchun: mfy nomi
}

type ImportResult struct {
	Inserted int `json:"inserted"`
	Updated  int `json:"updated"`
	Total    int `json:"total"`
}

type SetKuratorMFYsInput struct {
	MFYIDs []int64 `json:"mfy_ids"`
}

type KuratorSummary struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
}
