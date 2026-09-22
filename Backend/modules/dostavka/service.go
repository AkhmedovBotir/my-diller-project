package dostavka

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
	"diller-backend/modules/eskiz"
	"diller-backend/modules/region"
)

type Service struct {
	repo      *Repository
	pool      *pgxpool.Pool
	jwtSecret string
	jwtTTL    time.Duration
	sms       *eskiz.Service
}

func NewService(repo *Repository, pool *pgxpool.Pool, jwtSecret string, jwtTTL time.Duration, sms *eskiz.Service) *Service {
	return &Service{repo: repo, pool: pool, jwtSecret: jwtSecret, jwtTTL: jwtTTL, sms: sms}
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	item, err := s.findAccount(ctx, input.Username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(item.PasswordHash), []byte(input.Password)) != nil {
		return nil, ErrInvalidCredentials
	}

	return s.sms.Issue(ctx, eskiz.IssueInput{
		Phone:       item.Phone,
		Purpose:     eskiz.PurposeLogin,
		SubjectType: auth.SubjectDostavka,
		Payload:     eskiz.UserIDPayload(item.ID),
	})
}

func (s *Service) VerifyLogin(ctx context.Context, input eskiz.VerifyInput) (*LoginResponse, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	otp, err := s.sms.Verify(ctx, input.ChallengeID, input.Code, eskiz.PurposeLogin, auth.SubjectDostavka)
	if err != nil {
		return nil, err
	}

	userID, err := eskiz.ParseUserID(otp.Payload)
	if err != nil {
		return nil, err
	}

	item, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(
		s.jwtSecret,
		s.jwtTTL,
		item.ID,
		auth.SubjectDostavka,
		"",
	)
	if err != nil {
		return nil, fmt.Errorf("tokenni yaratib bo'lmadi: %w", err)
	}

	return &LoginResponse{Token: token, Dostavka: item}, nil
}

func (s *Service) ResendSMS(ctx context.Context, input eskiz.ResendInput, purpose string) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.sms.Resend(ctx, input.ChallengeID, purpose, auth.SubjectDostavka)
}

func (s *Service) ForgotPassword(ctx context.Context, input eskiz.ForgotInput) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	item, err := s.findAccount(ctx, strings.TrimSpace(input.Username))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, validationError("username", "Hisob topilmadi")
		}
		return nil, err
	}

	return s.sms.Issue(ctx, eskiz.IssueInput{
		Phone:       item.Phone,
		Purpose:     eskiz.PurposeReset,
		SubjectType: auth.SubjectDostavka,
		Payload:     eskiz.UserIDPayload(item.ID),
	})
}

func (s *Service) ResetPassword(ctx context.Context, input eskiz.ResetInput) error {
	if err := input.Validate(); err != nil {
		return err
	}

	otp, err := s.sms.Verify(ctx, input.ChallengeID, input.Code, eskiz.PurposeReset, auth.SubjectDostavka)
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

func (s *Service) findAccount(ctx context.Context, login string) (*Dostavka, error) {
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

func (s *Service) Create(ctx context.Context, input CreateInput) (*Dostavka, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	hash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, input, hash)
}

func (s *Service) CourierArea(ctx context.Context, id int64) (regionName, cityName, mfyName string, err error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", "", err
	}
	if item.MFYID != nil && *item.MFYID > 0 {
		labels, err := region.NewRepository(s.pool).ResolveLabels(ctx, *item.MFYID)
		if err != nil {
			return "", "", "", err
		}
		return labels.RegionName, labels.DistrictName, labels.MFYName, nil
	}
	return "", strings.TrimSpace(item.City), strings.TrimSpace(item.MFY), nil
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Dostavka, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetProfile(ctx context.Context, id int64) (*ProfileResponse, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.buildProfileResponse(ctx, item)
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]Dostavka, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateInput) (*Dostavka, error) {
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

	var kuratorID *int64
	if input.MFYID != nil && *input.MFYID > 0 {
		labels, err := region.NewRepository(s.pool).ResolveLabels(ctx, *input.MFYID)
		if err != nil {
			if errors.Is(err, region.ErrNotFound) {
				return nil, validationError("mfy_id", "MFY topilmadi")
			}
			return nil, err
		}
		input.City = labels.City
		input.MFY = labels.MFY
		kuratorID, err = kuratorassign.FindByMFYID(ctx, s.pool, *input.MFYID)
		if err != nil {
			return nil, fmt.Errorf("kuratorni topib bo'lmadi: %w", err)
		}
	} else {
		input.MFYID = nil
		input.City = ""
		input.MFY = ""
	}

	item, err := s.repo.UpdateProfile(ctx, id, input, hash, kuratorID)
	if err != nil {
		return nil, err
	}
	return s.buildProfileResponse(ctx, item)
}

func (s *Service) buildProfileResponse(ctx context.Context, item *Dostavka) (*ProfileResponse, error) {
	resp := &ProfileResponse{Dostavka: item}
	if item.KuratorID != nil {
		k, err := s.repo.GetKuratorSummary(ctx, *item.KuratorID)
		if err != nil {
			return nil, err
		}
		resp.Kurator = k
	}
	return resp, nil
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
