package ishlabchiqaruvchi

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound           = errors.New("ishlab chiqaruvchi topilmadi")
	ErrUsernameTaken      = errors.New("bu foydalanuvchi nomi band")
	ErrInvalidCredentials = errors.New("foydalanuvchi nomi yoki parol noto'g'ri")
	ErrValidation         = errors.New("validatsiya xatosi")
)

// roleKurator modules/admin.TypeKurator qiymati bilan mos keladi. Import
// tsiklidan qochish uchun bu yerda literal sifatida takrorlanadi.
const roleKurator = "kurator"

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

// nullKuratorID maps nil or 0 to SQL NULL.
func nullKuratorID(id *int64) any {
	if id == nil || *id == 0 {
		return nil
	}
	return *id
}

type Ishlabchiqaruvchi struct {
	ID           int64     `json:"id"`
	CompanyName  string    `json:"company_name"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Phone        string    `json:"phone"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Stir         string    `json:"stir"`
	BankAccount  string    `json:"bank_account"`
	BankName     string    `json:"bank_name"`
	Address      string    `json:"address"`
	Lat          *float64  `json:"lat,omitempty"`
	Lng          *float64  `json:"lng,omitempty"`
	KuratorID    *int64    `json:"kurator_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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
	Token             string             `json:"token"`
	Ishlabchiqaruvchi *Ishlabchiqaruvchi `json:"ishlabchiqaruvchi"`
}

type CreateInput struct {
	CompanyName string   `json:"company_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	Stir        string   `json:"stir,omitempty"`
	BankAccount string   `json:"bank_account,omitempty"`
	BankName    string   `json:"bank_name,omitempty"`
	Address     string   `json:"address,omitempty"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	// KuratorID optional; nil or 0 stores NULL
	KuratorID *int64 `json:"kurator_id,omitempty"`
}

func (i CreateInput) Validate() error {
	if strings.TrimSpace(i.CompanyName) == "" {
		return validationError("company_name", "Korxona nomi kiritilishi shart")
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
	CompanyName string   `json:"company_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Stir        string   `json:"stir"`
	BankAccount string   `json:"bank_account"`
	BankName    string   `json:"bank_name"`
	Address     string   `json:"address"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	// KuratorID optional; nil or 0 stores NULL
	KuratorID *int64 `json:"kurator_id,omitempty"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateInput) Validate() error {
	if strings.TrimSpace(i.CompanyName) == "" {
		return validationError("company_name", "Korxona nomi kiritilishi shart")
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
	CompanyName string   `json:"company_name"`
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Phone       string   `json:"phone"`
	Username    string   `json:"username"`
	Stir        string   `json:"stir"`
	BankAccount string   `json:"bank_account"`
	BankName    string   `json:"bank_name"`
	Address     string   `json:"address"`
	Lat         *float64 `json:"lat,omitempty"`
	Lng         *float64 `json:"lng,omitempty"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateProfileInput) Validate() error {
	if strings.TrimSpace(i.CompanyName) == "" {
		return validationError("company_name", "Korxona nomi kiritilishi shart")
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
