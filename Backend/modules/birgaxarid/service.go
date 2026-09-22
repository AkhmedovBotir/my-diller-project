package birgaxarid

import (
	"context"
	"strings"

	"diller-backend/modules/eskiz"
)

// CourierAreaProvider kuryer ishlaydigan hudud nomlarini qaytaradi.
type CourierAreaProvider interface {
	CourierArea(ctx context.Context, courierID int64) (region, city, mfy string, err error)
}

type Service struct {
	repo   *Repository
	sms    *eskiz.Service
	courier CourierAreaProvider
}

func NewService(repo *Repository, sms *eskiz.Service, courier CourierAreaProvider) *Service {
	return &Service{repo: repo, sms: sms, courier: courier}
}

func (s *Service) CreateCategory(ctx context.Context, in CategoryInput) (*Category, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.CreateCategory(ctx, in)
}

func (s *Service) ListCategories(ctx context.Context, limit, offset int) ([]Category, error) {
	return s.repo.ListCategories(ctx, limit, offset)
}

func (s *Service) GetCategory(ctx context.Context, id int64) (*Category, error) {
	return s.repo.GetCategory(ctx, id)
}

func (s *Service) UpdateCategory(ctx context.Context, id int64, in CategoryInput) (*Category, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateCategory(ctx, id, in)
}

func (s *Service) DeleteCategory(ctx context.Context, id int64) error {
	return s.repo.DeleteCategory(ctx, id)
}

func (s *Service) CreateSubcategory(ctx context.Context, in SubcategoryInput) (*Subcategory, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.CreateSubcategory(ctx, in)
}

func (s *Service) ListSubcategories(ctx context.Context, categoryID int64, limit, offset int) ([]Subcategory, error) {
	return s.repo.ListSubcategories(ctx, categoryID, limit, offset)
}

func (s *Service) UpdateSubcategory(ctx context.Context, id int64, in SubcategoryInput) (*Subcategory, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateSubcategory(ctx, id, in)
}

func (s *Service) DeleteSubcategory(ctx context.Context, id int64) error {
	return s.repo.DeleteSubcategory(ctx, id)
}

func (s *Service) CreateProduct(ctx context.Context, in ProductInput) (*Product, error) {
	if err := in.ValidateCreate(); err != nil {
		return nil, err
	}
	return s.repo.CreateProduct(ctx, in)
}

func (s *Service) ListProducts(ctx context.Context, categoryID int64, limit, offset int) ([]Product, error) {
	return s.repo.ListProducts(ctx, categoryID, limit, offset)
}

func (s *Service) ListProductsFiltered(ctx context.Context, categoryID, subcategoryID int64, limit, offset int) ([]Product, error) {
	return s.repo.ListProductsFiltered(ctx, categoryID, subcategoryID, limit, offset)
}

func (s *Service) GetProduct(ctx context.Context, id int64) (*Product, error) {
	return s.repo.GetProduct(ctx, id)
}

func (s *Service) UpdateProduct(ctx context.Context, id int64, in ProductInput) (*Product, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.PhotoURL) == "" {
		current, err := s.repo.GetProduct(ctx, id)
		if err != nil {
			return nil, err
		}
		in.PhotoURL = current.PhotoURL
	}
	return s.repo.UpdateProduct(ctx, id, in)
}

func (s *Service) DeleteProduct(ctx context.Context, id int64) error {
	return s.repo.DeleteProduct(ctx, id)
}

func (s *Service) CreateGroupBuy(ctx context.Context, in GroupBuyInput) (*GroupBuy, error) {
	if err := in.ValidateCreate(); err != nil {
		return nil, err
	}
	return s.repo.CreateGroupBuy(ctx, in)
}

func (s *Service) ListGroupBuys(ctx context.Context, status string, limit, offset int) ([]GroupBuy, error) {
	return s.repo.ListGroupBuys(ctx, strings.TrimSpace(status), limit, offset)
}

func (s *Service) GetGroupBuy(ctx context.Context, id int64) (*GroupBuy, error) {
	return s.repo.GetGroupBuy(ctx, id)
}

func (s *Service) UpdateGroupBuy(ctx context.Context, id int64, in GroupBuyInput) (*GroupBuy, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateGroupBuy(ctx, id, in)
}

func (s *Service) SetGroupBuyStatus(ctx context.Context, id int64, in GroupBuyStatusInput) (*GroupBuy, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	status := strings.TrimSpace(in.Status)
	item, err := s.repo.SetGroupBuyStatus(ctx, id, status)
	if err != nil {
		return nil, err
	}
	if status == "closed" {
		if err := s.repo.HandoffOrdersForGroupBuy(ctx, id); err != nil {
			return nil, err
		}
	}
	return item, nil
}

func (s *Service) DeleteGroupBuy(ctx context.Context, id int64) error {
	return s.repo.DeleteGroupBuy(ctx, id)
}

func (s *Service) CreateCustomer(ctx context.Context, in CustomerInput) (*Customer, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.CreateCustomer(ctx, in)
}

func (s *Service) ListCustomers(ctx context.Context, search string, limit, offset int) ([]Customer, error) {
	return s.repo.ListCustomers(ctx, search, limit, offset)
}

func (s *Service) GetCustomer(ctx context.Context, id int64) (*Customer, error) {
	return s.repo.GetCustomer(ctx, id)
}

func (s *Service) UpdateCustomer(ctx context.Context, id int64, in CustomerInput) (*Customer, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateCustomer(ctx, id, in)
}

func (s *Service) DeleteCustomer(ctx context.Context, id int64) error {
	return s.repo.DeleteCustomer(ctx, id)
}

func (s *Service) BlockCustomer(ctx context.Context, id int64, in BlockInput) (*Customer, error) {
	return s.repo.BlockCustomer(ctx, id, in.Reason)
}

func (s *Service) UnblockCustomer(ctx context.Context, id int64) (*Customer, error) {
	return s.repo.UnblockCustomer(ctx, id)
}
