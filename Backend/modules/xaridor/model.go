package xaridor

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound           = errors.New("xaridor topilmadi")
	ErrUsernameTaken      = errors.New("bu foydalanuvchi nomi band")
	ErrInvalidCredentials = errors.New("foydalanuvchi nomi yoki parol noto'g'ri")
	ErrValidation         = errors.New("validatsiya xatosi")
	ErrBlocked            = errors.New("hisobingiz bloklangan")
)

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func (e *ValidationError) Unwrap() error {
	return ErrValidation
}

func validationError(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

// ValidateMFO O'zbekiston bank MFO kodi (5 raqam).
func ValidateMFO(mfo string) error {
	mfo = strings.TrimSpace(mfo)
	if mfo == "" {
		return validationError("mfo", "MFO kiritilishi shart")
	}
	if len(mfo) != 5 {
		return validationError("mfo", "MFO 5 ta raqamdan iborat bo'lishi kerak")
	}
	for _, r := range mfo {
		if r < '0' || r > '9' {
			return validationError("mfo", "MFO faqat raqamlardan iborat bo'lishi kerak")
		}
	}
	return nil
}

type Xaridor struct {
	ID            int64     `json:"id"`
	ShopName      string    `json:"shop_name"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	Phone         string    `json:"phone"`
	Username      string    `json:"username"`
	PasswordHash  string    `json:"-"`
	Stir          string    `json:"stir"`
	BankAccount   string    `json:"bank_account"`
	BankName      string    `json:"bank_name"`
	MFO           string    `json:"mfo"`
	Address       string    `json:"address"`
	Lat           *float64  `json:"lat,omitempty"`
	Lng           *float64  `json:"lng,omitempty"`
	IsBlocked     bool      `json:"is_blocked"`
	BlockedReason string    `json:"blocked_reason"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (i LoginInput) Validate() error {
	if strings.TrimSpace(i.Username) == "" {
		return validationError("username", "Foydalanuvchi nomi kiritilishi shart")
	}
	if i.Password == "" {
		return validationError("password", "Parol kiritilishi shart")
	}
	return nil
}

type LoginResponse struct {
	Token   string   `json:"token"`
	Xaridor *Xaridor `json:"xaridor"`
}

type CreateInput struct {
	ShopName    string   `json:"shop_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	Stir        string   `json:"stir,omitempty"`
	BankAccount string   `json:"bank_account,omitempty"`
	BankName    string   `json:"bank_name,omitempty"`
	MFO         string   `json:"mfo,omitempty"`
	Address     string   `json:"address,omitempty"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
}

func (i CreateInput) Validate() error {
	if strings.TrimSpace(i.ShopName) == "" {
		return validationError("shop_name", "Do'kon nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.FirstName) == "" {
		return validationError("first_name", "Ism kiritilishi shart")
	}
	if strings.TrimSpace(i.LastName) == "" {
		return validationError("last_name", "Familiya kiritilishi shart")
	}
	if strings.TrimSpace(i.Phone) == "" {
		return validationError("phone", "Telefon raqami kiritilishi shart")
	}
	if strings.TrimSpace(i.Username) == "" {
		return validationError("username", "Foydalanuvchi nomi kiritilishi shart")
	}
	if len(i.Password) < 6 {
		return validationError("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

type UpdateInput struct {
	ShopName    string   `json:"shop_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Stir        string   `json:"stir"`
	BankAccount string   `json:"bank_account"`
	BankName    string   `json:"bank_name"`
	MFO         string   `json:"mfo"`
	Address     string   `json:"address"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateInput) Validate() error {
	if strings.TrimSpace(i.ShopName) == "" {
		return validationError("shop_name", "Do'kon nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.FirstName) == "" {
		return validationError("first_name", "Ism kiritilishi shart")
	}
	if strings.TrimSpace(i.LastName) == "" {
		return validationError("last_name", "Familiya kiritilishi shart")
	}
	if strings.TrimSpace(i.Phone) == "" {
		return validationError("phone", "Telefon raqami kiritilishi shart")
	}
	if strings.TrimSpace(i.Username) == "" {
		return validationError("username", "Foydalanuvchi nomi kiritilishi shart")
	}
	if i.Password != "" && len(i.Password) < 6 {
		return validationError("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

type UpdateProfileInput struct {
	ShopName    string   `json:"shop_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Stir        string   `json:"stir"`
	BankAccount string   `json:"bank_account"`
	BankName    string   `json:"bank_name"`
	MFO         string   `json:"mfo"`
	Address     string   `json:"address"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateProfileInput) Validate() error {
	if strings.TrimSpace(i.ShopName) == "" {
		return validationError("shop_name", "Do'kon nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.FirstName) == "" {
		return validationError("first_name", "Ism kiritilishi shart")
	}
	if strings.TrimSpace(i.LastName) == "" {
		return validationError("last_name", "Familiya kiritilishi shart")
	}
	if strings.TrimSpace(i.Phone) == "" {
		return validationError("phone", "Telefon raqami kiritilishi shart")
	}
	if strings.TrimSpace(i.Username) == "" {
		return validationError("username", "Foydalanuvchi nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.Stir) == "" {
		return validationError("stir", "STIR kiritilishi shart")
	}
	if strings.TrimSpace(i.BankName) == "" {
		return validationError("bank_name", "Bank nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.BankAccount) == "" {
		return validationError("bank_account", "Hisob raqami kiritilishi shart")
	}
	if err := ValidateMFO(i.MFO); err != nil {
		return err
	}
	if strings.TrimSpace(i.Address) == "" {
		return validationError("address", "Manzil kiritilishi shart")
	}
	if i.Lat == nil {
		return validationError("lat", "Xaritadan joylashuvni tanlang")
	}
	if i.Lng == nil {
		return validationError("lng", "Xaritadan joylashuvni tanlang")
	}
	if i.Password != "" && len(i.Password) < 6 {
		return validationError("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

type BlockInput struct {
	Reason string `json:"reason"`
}

func (i BlockInput) Validate() error {
	if strings.TrimSpace(i.Reason) == "" {
		return validationError("reason", "Bloklash sababi kiritilishi shart")
	}
	return nil
}
