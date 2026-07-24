package category

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input CreateCategoryInput) (*Category, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, input)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Category, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]Category, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateCategoryInput) (*Category, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) CreateSubcategory(ctx context.Context, input CreateSubcategoryInput) (*Subcategory, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	exists, err := s.repo.Exists(ctx, input.CategoryID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, validationError("category_id", "Bunday kategoriya mavjud emas")
	}

	return s.repo.CreateSubcategory(ctx, input)
}

func (s *Service) GetSubcategoryByID(ctx context.Context, id int64) (*Subcategory, error) {
	return s.repo.GetSubcategoryByID(ctx, id)
}

func (s *Service) ListSubcategories(ctx context.Context, categoryID int64, limit, offset int) ([]Subcategory, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListSubcategories(ctx, categoryID, limit, offset)
}

func (s *Service) UpdateSubcategory(ctx context.Context, id int64, input UpdateSubcategoryInput) (*Subcategory, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	exists, err := s.repo.Exists(ctx, input.CategoryID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, validationError("category_id", "Bunday kategoriya mavjud emas")
	}

	return s.repo.UpdateSubcategory(ctx, id, input)
}

func (s *Service) DeleteSubcategory(ctx context.Context, id int64) error {
	return s.repo.DeleteSubcategory(ctx, id)
}

func normalizePagination(limit, offset int) (int, int) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
