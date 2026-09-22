package eskiz

import (
	"encoding/json"
	"errors"
	"time"
)

const (
	PurposeLogin    = "login"
	PurposeRegister = "register"
	PurposeReset    = "reset"

	CodeLength     = 6
	OTPTTL         = 5 * time.Minute
	ResendCooldown = 60 * time.Second
	MaxAttempts    = 5
)

var (
	ErrNotConfigured     = errors.New("SMS xizmati sozlanmagan")
	ErrPhoneInvalid      = errors.New("telefon raqami SMS yuborish uchun noto'g'ri")
	ErrInvalidCode       = errors.New("tasdiqlash kodi noto'g'ri")
	ErrExpired           = errors.New("tasdiqlash kodi muddati tugagan")
	ErrChallengeNotFound = errors.New("tasdiqlash so'rovi topilmadi")
	ErrTooSoon           = errors.New("qayta yuborish uchun biroz kuting")
	ErrMaxAttempts       = errors.New("kod noto'g'ri kiritishlar soni oshib ketdi")
	ErrSendFailed        = errors.New("SMS yuborib bo'lmadi. Keyinroq urinib ko'ring")
	ErrConsumed          = errors.New("tasdiqlash kodi allaqachon ishlatilgan")
)

type OTP struct {
	ID           int64
	ChallengeID  string
	Phone        string
	Purpose      string
	SubjectType  string
	CodeHash     string
	Payload      json.RawMessage
	Attempts     int
	MaxAttempts  int
	ExpiresAt    time.Time
	ConsumedAt   *time.Time
	LastSentAt   time.Time
	CreatedAt    time.Time
}

type Challenge struct {
	SMSRequired  bool   `json:"sms_required"`
	ChallengeID  string `json:"challenge_id"`
	PhoneMasked  string `json:"phone_masked"`
	ExpiresIn    int    `json:"expires_in"`
	ResendAfter  int    `json:"resend_after"`
}

type IssueInput struct {
	Phone       string
	Purpose     string
	SubjectType string
	Payload     []byte
}

type VerifyInput struct {
	ChallengeID string `json:"challenge_id"`
	Code        string `json:"code"`
}

func (i VerifyInput) Validate() error {
	if i.ChallengeID == "" {
		return errField("challenge_id", "Tasdiqlash so'rovi kiritilishi shart")
	}
	if len(Digits(i.Code)) != CodeLength {
		return errField("code", "Tasdiqlash kodi 6 ta raqamdan iborat bo'lishi kerak")
	}
	return nil
}

type ResendInput struct {
	ChallengeID string `json:"challenge_id"`
}

func (i ResendInput) Validate() error {
	if i.ChallengeID == "" {
		return errField("challenge_id", "Tasdiqlash so'rovi kiritilishi shart")
	}
	return nil
}

type ForgotInput struct {
	Username string `json:"username"`
}

func (i ForgotInput) Validate() error {
	if i.Username == "" {
		return errField("username", "Login yoki telefon raqami kiritilishi shart")
	}
	return nil
}

type ResetInput struct {
	ChallengeID string `json:"challenge_id"`
	Code        string `json:"code"`
	Password    string `json:"password"`
}

func (i ResetInput) Validate() error {
	if err := (VerifyInput{ChallengeID: i.ChallengeID, Code: i.Code}).Validate(); err != nil {
		return err
	}
	if len(i.Password) < 6 {
		return errField("password", "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
	}
	return nil
}

type FieldError struct {
	Field   string
	Message string
}

func (e *FieldError) Error() string { return e.Message }

func errField(field, message string) error {
	return &FieldError{Field: field, Message: message}
}

func (o *OTP) ToChallenge() *Challenge {
	expiresIn := int(time.Until(o.ExpiresAt).Seconds())
	if expiresIn < 0 {
		expiresIn = 0
	}
	resendAfter := int(ResendCooldown.Seconds() - time.Since(o.LastSentAt).Seconds())
	if resendAfter < 0 {
		resendAfter = 0
	}
	return &Challenge{
		SMSRequired: true,
		ChallengeID: o.ChallengeID,
		PhoneMasked: MaskPhone(o.Phone),
		ExpiresIn:   expiresIn,
		ResendAfter: resendAfter,
	}
}
