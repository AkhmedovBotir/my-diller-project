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
	MFO          string    `json:"mfo"`
	Address      string    `json:"address"`
	Lat          *float64   `json:"lat,omitempty"`
	Lng          *float64   `json:"lng,omitempty"`
	City         string     `json:"city"`
	MFY          string     `json:"mfy"`
	BirthDate    *time.Time `json:"birth_date,omitempty"`
	KuratorID    *int64     `json:"kurator_id,omitempty"`
	MFYID        *int64     `json:"mfy_id,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type KuratorSummary struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
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

// RegisterInput — ishlab chiqaruvchining o'zi ro'yxatdan o'tishi uchun
// minimal maydonlar. Ism-familiya keyinroq profilni to'ldirishda kiritiladi.
type RegisterInput struct {
	CompanyName string `json:"company_name"`
	Stir        string `json:"stir"`
	Phone       string `json:"phone"`
	Password    string `json:"password"`
}

func (i RegisterInput) Validate() error {
	if strings.TrimSpace(i.CompanyName) == "" {
		return validationError("company_name", "Korxona nomi kiritilishi shart")
	}
	if strings.TrimSpace(i.Stir) == "" {
		return validationError("stir", "STIR (INN) kiritilishi shart")
	}
	if strings.TrimSpace(i.Phone) == "" {
		return validationError("phone", "Telefon raqami kiritilishi shart")
	}
	if len(i.Password) < 6 {
		return validationError("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

// normalizePhoneDigits telefon raqamidan faqat raqamlarni qoldiradi —
// username sifatida ishlatiladi.
func normalizePhoneDigits(phone string) string {
	var b strings.Builder
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// ProfileComplete profil buyurtmalarni qabul qilish uchun to'liq
// to'ldirilganligini tekshiradi.
func ProfileComplete(item *Ishlabchiqaruvchi) bool {
	if item == nil {
		return false
	}
	return strings.TrimSpace(item.CompanyName) != "" &&
		strings.TrimSpace(item.Stir) != "" &&
		strings.TrimSpace(item.BankAccount) != "" &&
		strings.TrimSpace(item.BankName) != "" &&
		strings.TrimSpace(item.MFO) != "" &&
		item.MFYID != nil && *item.MFYID > 0 &&
		item.BirthDate != nil &&
		strings.TrimSpace(item.Address) != "" &&
		strings.TrimSpace(item.FirstName) != "" &&
		strings.TrimSpace(item.LastName) != "" &&
		strings.TrimSpace(item.Phone) != "" &&
		item.Lat != nil && item.Lng != nil
}

// ProfileResponse GetProfile/UpdateProfile javobiga profil to'liqligi
// haqidagi hisoblangan maydonni qo'shadi.
type ProfileResponse struct {
	*Ishlabchiqaruvchi
	ProfileComplete bool            `json:"profile_complete"`
	Kurator         *KuratorSummary `json:"kurator,omitempty"`
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
	MFO         string   `json:"mfo,omitempty"`
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
	MFO         string   `json:"mfo"`
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
	City        string   `json:"city"`
	MFY         string   `json:"mfy"`
	MFYID       *int64   `json:"mfy_id"`
	BirthDate   string   `json:"birth_date"`
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
	if i.MFYID == nil || *i.MFYID <= 0 {
		return validationError("mfy_id", "MFY tanlanishi shart")
	}
	if strings.TrimSpace(i.BirthDate) == "" {
		return validationError("birth_date", "Tug'ilgan sana kiritilishi shart")
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

