package xaridor

import (
	"context"
	"errors"
	"fmt"
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

	item, err := s.repo.GetByUsername(ctx, input.Username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(item.PasswordHash), []byte(input.Password)) != nil {
		return nil, ErrInvalidCredentials
	}

	if item.IsBlocked {
		return nil, fmt.Errorf("%w: %s", ErrBlocked, item.BlockedReason)
	}

	token, err := auth.GenerateToken(
		s.jwtSecret,
		s.jwtTTL,
		item.ID,
		auth.SubjectXaridor,
		"",
	)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Xaridor: item}, nil
}

func (s *Service) Register(ctx context.Context, input CreateInput) (*LoginResponse, error) {
	item, err := s.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(
		s.jwtSecret,
		s.jwtTTL,
		item.ID,
		auth.SubjectXaridor,
		"",
	)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Xaridor: item}, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Xaridor, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, input, hash)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Xaridor, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]Xaridor, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateInput) (*Xaridor, error) {
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

func (s *Service) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput) (*Xaridor, error) {
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

	return s.repo.UpdateProfile(ctx, id, input, hash)
}

func (s *Service) Block(ctx context.Context, id int64, input BlockInput) (*Xaridor, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.repo.Block(ctx, id, input.Reason)
}

func (s *Service) Unblock(ctx context.Context, id int64) (*Xaridor, error) {
	return s.repo.Unblock(ctx, id)
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
