package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"diller-backend/internal/pkg/auth"
)

type Service struct {
	repo      *Repository
	jwtSecret string
	jwtTTL    time.Duration
}

func NewService(repo *Repository, jwtSecret string, jwtTTL time.Duration) *Service {
	return &Service{repo: repo, jwtSecret: jwtSecret, jwtTTL: jwtTTL}
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*LoginResponse, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	a, err := s.repo.GetByUsername(ctx, input.Username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)) != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := auth.GenerateToken(s.jwtSecret, s.jwtTTL, a.ID, auth.SubjectAdmin, a.Type)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Admin: a}, nil
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
