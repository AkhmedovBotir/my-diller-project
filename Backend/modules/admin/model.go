package admin

import (
	"errors"
	"slices"
	"strings"
	"time"
)

var (
	ErrNotFound           = errors.New("admin topilmadi")
	ErrUsernameTaken      = errors.New("bu foydalanuvchi nomi band")
	ErrInvalidCredentials = errors.New("foydalanuvchi nomi yoki parol noto'g'ri")
	ErrValidation         = errors.New("validatsiya xatosi")
)

const (
	TypeGeneral = "general"
	TypeAdmin   = "admin"
	TypeKurator = "kurator"
)

var validTypes = []string{TypeGeneral, TypeAdmin, TypeKurator}

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

type Admin struct {
	ID           int64     `json:"id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Phone        string    `json:"phone"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Type         string    `json:"type"`
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
	Token string `json:"token"`
	Admin *Admin `json:"admin"`
}

type CreateAdminInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Type      string `json:"type"`
}

func (i CreateAdminInput) Validate() error {
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
	if !slices.Contains(validTypes, i.Type) {
		return validationError("type", "Admin turi general, admin yoki kurator bo'lishi kerak")
	}
	return nil
}

type UpdateAdminInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
	Type      string `json:"type"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateAdminInput) Validate() error {
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
	if !slices.Contains(validTypes, i.Type) {
		return validationError("type", "Admin turi general, admin yoki kurator bo'lishi kerak")
	}
	if i.Password != "" && len(i.Password) < 6 {
		return validationError("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

type UpdateProfileInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
	// Password bo'sh bo'lsa o'zgartirilmaydi
	Password string `json:"password,omitempty"`
}

func (i UpdateProfileInput) Validate() error {
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
