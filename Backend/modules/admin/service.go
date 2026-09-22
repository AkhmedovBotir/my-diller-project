package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"diller-backend/internal/pkg/auth"
	"diller-backend/modules/eskiz"
)

type Service struct {
	repo      *Repository
	jwtSecret string
	jwtTTL    time.Duration
	sms       *eskiz.Service
}

func NewService(repo *Repository, jwtSecret string, jwtTTL time.Duration, sms *eskiz.Service) *Service {
	return &Service{repo: repo, jwtSecret: jwtSecret, jwtTTL: jwtTTL, sms: sms}
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	a, err := s.findAccount(ctx, input.Username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)) != nil {
		return nil, ErrInvalidCredentials
	}

	return s.sms.Issue(ctx, eskiz.IssueInput{
		Phone:       a.Phone,
		Purpose:     eskiz.PurposeLogin,
		SubjectType: auth.SubjectAdmin,
		Payload:     eskiz.UserIDPayload(a.ID),
	})
}

func (s *Service) VerifyLogin(ctx context.Context, input eskiz.VerifyInput) (*LoginResponse, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	otp, err := s.sms.Verify(ctx, input.ChallengeID, input.Code, eskiz.PurposeLogin, auth.SubjectAdmin)
	if err != nil {
		return nil, err
	}

	userID, err := eskiz.ParseUserID(otp.Payload)
	if err != nil {
		return nil, err
	}

	a, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(s.jwtSecret, s.jwtTTL, a.ID, auth.SubjectAdmin, a.Type)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Admin: a}, nil
}

func (s *Service) ResendSMS(ctx context.Context, input eskiz.ResendInput, purpose string) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.sms.Resend(ctx, input.ChallengeID, purpose, auth.SubjectAdmin)
}

func (s *Service) ForgotPassword(ctx context.Context, input eskiz.ForgotInput) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	a, err := s.findAccount(ctx, strings.TrimSpace(input.Username))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, validationError("username", "Hisob topilmadi")
		}
		return nil, err
	}

	return s.sms.Issue(ctx, eskiz.IssueInput{
		Phone:       a.Phone,
		Purpose:     eskiz.PurposeReset,
		SubjectType: auth.SubjectAdmin,
		Payload:     eskiz.UserIDPayload(a.ID),
	})
}

func (s *Service) ResetPassword(ctx context.Context, input eskiz.ResetInput) error {
	if err := input.Validate(); err != nil {
		return err
	}

	otp, err := s.sms.Verify(ctx, input.ChallengeID, input.Code, eskiz.PurposeReset, auth.SubjectAdmin)
	if err != nil {
		return err
	}

	userID, err := eskiz.ParseUserID(otp.Payload)
	if err != nil {
		return err
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, userID, hash)
}

func (s *Service) findAccount(ctx context.Context, login string) (*Admin, error) {
	for _, candidate := range eskiz.LookupCandidates(login) {
		item, err := s.repo.GetByUsername(ctx, candidate)
		if err == nil {
			return item, nil
		}
		if !errors.Is(err, ErrNotFound) {
			return nil, err
		}
		item, err = s.repo.GetByPhone(ctx, candidate)
		if err == nil {
			return item, nil
		}
		if !errors.Is(err, ErrNotFound) {
			return nil, err
		}
	}
	return nil, ErrNotFound
}

func (s *Service) Create(ctx context.Context, input CreateAdminInput) (*Admin, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, input, hash)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Admin, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, adminType string, limit, offset int) ([]Admin, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, adminType, limit, offset)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateAdminInput) (*Admin, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash := ""
	if input.Password != "" {
		var err error
		if hash, err = hashPassword(input.Password); err != nil {
			return nil, err
		}
	}

	return s.repo.Update(ctx, id, input, hash)
}

func (s *Service) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput) (*Admin, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash := ""
	if input.Password != "" {
		var err error
		if hash, err = hashPassword(input.Password); err != nil {
			return nil, err
		}
	}

	birthDate, err := parseBirthDate(input.BirthDate)
	if err != nil {
		return nil, err
	}

	return s.repo.UpdateProfile(ctx, id, input, hash, birthDate)
}

func parseBirthDate(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, validationError("birth_date", "Tug'ilgan sana YYYY-MM-DD formatida bo'lishi kerak")
	}
	return &t, nil
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("parolni himoyalab bo'lmadi: %w", err)
	}
	return string(hash), nil
}
