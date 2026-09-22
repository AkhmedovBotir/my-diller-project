package eskiz

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	tplLogin    = "mydiller.uz saytiga kirish uchun tasdiqlash kodi: %s. Kodni begonalarga oshkor qilmang!"
	tplRegister = "mydiller.uz saytiga ro'yxatdan o'tish uchun tasdiqlash kodi: %s. Kodni hech kimga bermang!"
	tplReset    = "mydiller.uz saytidagi profilingiz parolini tiklash uchun tasdiqlash kodi: %s"
)

type Service struct {
	repo   *Repository
	client *Client
	secret string
}

func NewService(repo *Repository, client *Client, secret string) *Service {
	return &Service{repo: repo, client: client, secret: secret}
}

func (s *Service) Issue(ctx context.Context, input IssueInput) (*Challenge, error) {
	phone, err := NormalizePhone(input.Phone)
	if err != nil {
		return nil, err
	}
	if input.Payload == nil {
		input.Payload = []byte("{}")
	}

	if existing, err := s.repo.FindActive(ctx, phone, input.Purpose, input.SubjectType); err == nil {
		if time.Since(existing.LastSentAt) < ResendCooldown {
			return existing.ToChallenge(), nil
		}
	}

	code, err := generateCode()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	challengeID := uuid.NewString()
	item := &OTP{
		ChallengeID: challengeID,
		Phone:       phone,
		Purpose:     input.Purpose,
		SubjectType: input.SubjectType,
		CodeHash:    s.hashCode(challengeID, code),
		Payload:     json.RawMessage(input.Payload),
		MaxAttempts: MaxAttempts,
		ExpiresAt:   now.Add(OTPTTL),
		LastSentAt:  now,
	}

	if err := s.repo.InvalidateActive(ctx, phone, input.Purpose, input.SubjectType); err != nil {
		return nil, err
	}

	otp, err := s.repo.Create(ctx, item)
	if err != nil {
		return nil, err
	}

	if err := s.client.Send(ctx, phone, renderTemplate(input.Purpose, code)); err != nil {
		_ = s.repo.Consume(ctx, otp.ID)
		return nil, err
	}
	return otp.ToChallenge(), nil
}

func (s *Service) Resend(ctx context.Context, challengeID, purpose, subjectType string) (*Challenge, error) {
	otp, err := s.repo.GetByChallenge(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if otp.Purpose != purpose || otp.SubjectType != subjectType {
		return nil, ErrChallengeNotFound
	}
	if otp.ConsumedAt != nil {
		return nil, ErrConsumed
	}
	if time.Now().After(otp.ExpiresAt) {
		return nil, ErrExpired
	}
	if time.Since(otp.LastSentAt) < ResendCooldown {
		return nil, ErrTooSoon
	}

	code, err := generateCode()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	updated, err := s.repo.Refresh(
		ctx,
		otp.ID,
		s.hashCode(otp.ChallengeID, code),
		otp.Payload,
		now.Add(OTPTTL),
		now,
	)
	if err != nil {
		return nil, err
	}

	if err := s.client.Send(ctx, otp.Phone, renderTemplate(otp.Purpose, code)); err != nil {
		return nil, err
	}
	return updated.ToChallenge(), nil
}

func (s *Service) Verify(ctx context.Context, challengeID, code, purpose, subjectType string) (*OTP, error) {
	code = Digits(code)
	if len(code) != CodeLength {
		return nil, ErrInvalidCode
	}

	otp, err := s.repo.GetByChallenge(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if otp.Purpose != purpose || otp.SubjectType != subjectType {
		return nil, ErrChallengeNotFound
	}
	if otp.ConsumedAt != nil {
		return nil, ErrConsumed
	}
	if time.Now().After(otp.ExpiresAt) {
		return nil, ErrExpired
	}
	if otp.Attempts >= otp.MaxAttempts {
		return nil, ErrMaxAttempts
	}

	if !hmac.Equal([]byte(otp.CodeHash), []byte(s.hashCode(otp.ChallengeID, code))) {
		_ = s.repo.IncrementAttempts(ctx, otp.ID)
		if otp.Attempts+1 >= otp.MaxAttempts {
			return nil, ErrMaxAttempts
		}
		return nil, ErrInvalidCode
	}

	if err := s.repo.Consume(ctx, otp.ID); err != nil {
		return nil, err
	}
	return otp, nil
}

func (s *Service) hashCode(challengeID, code string) string {
	mac := hmac.New(sha256.New, []byte(s.secret))
	mac.Write([]byte(challengeID + ":" + code))
	return hex.EncodeToString(mac.Sum(nil))
}

func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("tasdiqlash kodini yaratib bo'lmadi: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func renderTemplate(purpose, code string) string {
	switch purpose {
	case PurposeRegister:
		return fmt.Sprintf(tplRegister, code)
	case PurposeReset:
		return fmt.Sprintf(tplReset, code)
	default:
		return fmt.Sprintf(tplLogin, code)
	}
}

func UserIDPayload(userID int64) []byte {
	raw, _ := json.Marshal(map[string]int64{"user_id": userID})
	return raw
}

func ParseUserID(payload []byte) (int64, error) {
	var data struct {
		UserID int64 `json:"user_id"`
	}
	if err := json.Unmarshal(payload, &data); err != nil || data.UserID <= 0 {
		return 0, ErrChallengeNotFound
	}
	return data.UserID, nil
}

func MustJSON(v any) []byte {
	raw, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return raw
}

func PurposeOK(purpose string) bool {
	switch strings.TrimSpace(purpose) {
	case PurposeLogin, PurposeRegister, PurposeReset:
		return true
	default:
		return false
	}
}
