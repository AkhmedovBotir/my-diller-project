package ishlabchiqaruvchi

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/kuratorassign"
	"diller-backend/modules/region"
)

type Service struct {
	repo      *Repository
	pool      *pgxpool.Pool
	jwtSecret string
	jwtTTL    time.Duration
}

func NewService(repo *Repository, pool *pgxpool.Pool, jwtSecret string, jwtTTL time.Duration) *Service {
	return &Service{repo: repo, pool: pool, jwtSecret: jwtSecret, jwtTTL: jwtTTL}
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*LoginResponse, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	// Username yoki telefon raqami orqali kirish — register'da username=phone
	// bo'lgani uchun ikkisi ham ishlaydi, lekin admin tomonidan qo'lda
	// yaratilgan hisoblarda username boshqacha bo'lishi mumkin.
	item, err := s.repo.GetByUsername(ctx, input.Username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			item, err = s.repo.GetByPhone(ctx, input.Username)
		}
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return nil, ErrInvalidCredentials
			}
			return nil, err
		}
	}

	if bcrypt.CompareHashAndPassword([]byte(item.PasswordHash), []byte(input.Password)) != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := auth.GenerateToken(
		s.jwtSecret,
		s.jwtTTL,
		item.ID,
		auth.SubjectIshlabchiqaruvchi,
		"",
	)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Ishlabchiqaruvchi: item}, nil
}

// Register ishlab chiqaruvchining o'zi ro'yxatdan o'tishi — username telefon
// raqamidan (faqat raqamlar) olinadi, ism-familiya keyinroq profilda
// to'ldiriladi.
func (s *Service) Register(ctx context.Context, input RegisterInput) (*LoginResponse, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	username := normalizePhoneDigits(input.Phone)
	if username == "" {
		return nil, validationError("phone", "Telefon raqami noto'g'ri")
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	createInput := CreateInput{
		CompanyName: input.CompanyName,
		Phone:       input.Phone,
		Username:    username,
		Stir:        input.Stir,
	}

	item, err := s.repo.Create(ctx, createInput, hash)
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(
		s.jwtSecret,
		s.jwtTTL,
		item.ID,
		auth.SubjectIshlabchiqaruvchi,
		"",
	)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Ishlabchiqaruvchi: item}, nil
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Ishlabchiqaruvchi, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, input, hash)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Ishlabchiqaruvchi, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]Ishlabchiqaruvchi, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateInput) (*Ishlabchiqaruvchi, error) {
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

func (s *Service) GetProfile(ctx context.Context, id int64) (*ProfileResponse, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.buildProfileResponse(ctx, item)
}

func (s *Service) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput) (*ProfileResponse, error) {
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

	labels, err := region.NewRepository(s.pool).ResolveLabels(ctx, *input.MFYID)
	if err != nil {
		if errors.Is(err, region.ErrNotFound) {
			return nil, validationError("mfy_id", "MFY topilmadi")
		}
		return nil, err
	}
	input.City = labels.City
	input.MFY = labels.MFY

	kuratorID, err := kuratorassign.FindByMFYID(ctx, s.pool, *input.MFYID)
	if err != nil {
		return nil, fmt.Errorf("kuratorni topib bo'lmadi: %w", err)
	}

	item, err := s.repo.UpdateProfile(ctx, id, input, hash, birthDate, kuratorID)
	if err != nil {
		return nil, err
	}
	return s.buildProfileResponse(ctx, item)
}

func (s *Service) buildProfileResponse(ctx context.Context, item *Ishlabchiqaruvchi) (*ProfileResponse, error) {
	resp := &ProfileResponse{Ishlabchiqaruvchi: item, ProfileComplete: ProfileComplete(item)}
	if item.KuratorID != nil {
		k, err := s.repo.GetKuratorSummary(ctx, *item.KuratorID)
		if err != nil {
			return nil, err
		}
		resp.Kurator = k
	}
	return resp, nil
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
