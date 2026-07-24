package product

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"diller-backend/internal/pkg/upload"
)

type Service struct {
	repo    *Repository
	storage *upload.Storage
}

func NewService(repo *Repository, storage *upload.Storage) *Service {
	return &Service{repo: repo, storage: storage}
}

func (s *Service) ensureCategoryLink(ctx context.Context, categoryID, subcategoryID int64) error {
	ok, err := s.repo.SubcategoryBelongsToCategory(ctx, categoryID, subcategoryID)
	if err != nil {
		return err
	}
	if !ok {
		return validationError("subcategory_id", "Subkategoriya tanlangan kategoriyaga tegishli emas")
	}
	return nil
}

func (s *Service) uniqueCode(ctx context.Context) (string, error) {
	for i := 0; i < 20; i++ {
		code, err := GenerateCode()
		if err != nil {
			return "", err
		}
		exists, err := s.repo.CodeExists(ctx, code)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", fmt.Errorf("unikal mahsulot kodini yaratib bo'lmadi, qayta urinib ko'ring")
}

func (s *Service) CreateByManufacturer(ctx context.Context, ownerID int64, input CreateInput) (*Product, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureCategoryLink(ctx, input.CategoryID, input.SubcategoryID); err != nil {
		return nil, err
	}

	code, err := s.uniqueCode(ctx)
	if err != nil {
		return nil, err
	}

	p, err := s.repo.Create(ctx, code, ownerID, input, StatusPending)
	if err != nil {
		if errors.Is(err, ErrCodeTaken) {
			// juda kam uchraydigan race — qayta urinish
			code, err = s.uniqueCode(ctx)
			if err != nil {
				return nil, err
			}
			return s.repo.Create(ctx, code, ownerID, input, StatusPending)
		}
		return nil, err
	}
	return p, nil
}

func (s *Service) ListByManufacturer(ctx context.Context, ownerID int64, status string, limit, offset int) ([]Product, error) {
	if status != "" && status != StatusPending && status != StatusApproved && status != StatusRejected {
		return nil, validationError("status", "status pending, approved yoki rejected bo'lishi kerak")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListByOwner(ctx, ownerID, status, limit, offset)
}

func (s *Service) GetByManufacturer(ctx context.Context, ownerID, id int64) (*Product, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p.IshlabchiqaruvchiID != ownerID {
		return nil, ErrForbidden
	}
	return p, nil
}

func (s *Service) UpdateByManufacturer(ctx context.Context, ownerID, id int64, input UpdateInput) (*Product, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureCategoryLink(ctx, input.CategoryID, input.SubcategoryID); err != nil {
		return nil, err
	}

	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}

	images := existing.Images
	if input.HasNewImages {
		images = input.Images
	}

	// Ishlab chiqaruvchi o'zgartirganda qayta tasdiq kutadi
	p, err := s.repo.Update(ctx, id, input, images, StatusPending, "", true)
	if err != nil {
		return nil, err
	}

	if input.HasNewImages {
		s.storage.RemoveByURLs(existing.Images)
	}
	return p, nil
}

func (s *Service) ResubmitByManufacturer(ctx context.Context, ownerID, id int64) (*Product, error) {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusRejected {
		return nil, ErrBadStatus
	}
	return s.repo.Resubmit(ctx, id)
}

func (s *Service) DeleteByManufacturer(ctx context.Context, ownerID, id int64) error {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return err
	}
	if existing.Status == StatusApproved {
		return validationError("status", "Tasdiqlangan mahsulotni o'chirib bo'lmaydi, admin bilan bog'laning")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.storage.RemoveByURLs(existing.Images)
	return nil
}

func (s *Service) ListForAdmin(ctx context.Context, status string, limit, offset int) ([]Product, error) {
	if status != "" && status != StatusPending && status != StatusApproved && status != StatusRejected {
		return nil, validationError("status", "status pending, approved yoki rejected bo'lishi kerak")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListAll(ctx, status, limit, offset)
}

func (s *Service) GetForAdmin(ctx context.Context, id int64) (*Product, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) UpdateByAdmin(ctx context.Context, id int64, input UpdateInput) (*Product, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureCategoryLink(ctx, input.CategoryID, input.SubcategoryID); err != nil {
		return nil, err
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	images := existing.Images
	if input.HasNewImages {
		images = input.Images
	}

	// Admin o'zgartirganda qayta tasdiq shart emas — darhol approved
	p, err := s.repo.Update(ctx, id, input, images, StatusApproved, "", false)
	if err != nil {
		return nil, err
	}

	if input.HasNewImages {
		s.storage.RemoveByURLs(existing.Images)
	}
	return p, nil
}

func (s *Service) Approve(ctx context.Context, adminID, id int64) (*Product, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusPending {
		return nil, ErrBadStatus
	}
	return s.repo.SetStatus(ctx, id, StatusApproved, "", &adminID)
}

func (s *Service) Reject(ctx context.Context, adminID, id int64, input RejectInput) (*Product, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusPending {
		return nil, ErrBadStatus
	}
	return s.repo.SetStatus(ctx, id, StatusRejected, input.Note, &adminID)
}

func (s *Service) ListCatalog(ctx context.Context, categoryID, subcategoryID int64, search string, limit, offset int) ([]Product, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListApproved(ctx, categoryID, subcategoryID, strings.TrimSpace(search), limit, offset)
}

func (s *Service) GetCatalog(ctx context.Context, id int64) (*Product, error) {
	return s.repo.GetApproved(ctx, id)
}

func (s *Service) DeleteByAdmin(ctx context.Context, id int64) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.storage.RemoveByURLs(existing.Images)
	return nil
}
