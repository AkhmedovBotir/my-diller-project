package birgaxarid

import (
	"context"
	"strings"
)

func (s *Service) ListOrdersAdmin(ctx context.Context, status string, limit, offset int) ([]OrderView, error) {
	return s.repo.ListOrdersAdmin(ctx, strings.TrimSpace(status), limit, offset)
}

func (s *Service) GetOrderAdmin(ctx context.Context, id int64) (*OrderView, error) {
	return s.repo.GetOrderView(ctx, id)
}

func (s *Service) ListCourierOrders(ctx context.Context, courierID int64, limit, offset int) ([]OrderView, error) {
	if s.courier == nil {
		return nil, validationError("courier", "Kuryer hududi sozlanmagan")
	}
	region, city, mfy, err := s.courier.CourierArea(ctx, courierID)
	if err != nil {
		return nil, err
	}
	if region == "" && city == "" && mfy == "" {
		return nil, validationError("profile", "Avval profilingizda MFY/hududni to'ldiring")
	}
	items, err := s.repo.ListCourierOrders(ctx, courierID, region, city, mfy, limit, offset)
	if err != nil {
		return nil, err
	}
	// Kuryerga kodni ochib bermaymiz — mijoz aytadi.
	for i := range items {
		items[i].PickupCode = ""
	}
	return items, nil
}

func (s *Service) GetCourierOrder(ctx context.Context, courierID, orderID int64) (*OrderView, error) {
	items, err := s.ListCourierOrders(ctx, courierID, 500, 0)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].ID == orderID {
			return &items[i], nil
		}
	}
	return nil, ErrNotFound
}

func (s *Service) ClaimCourierOrder(ctx context.Context, courierID, orderID int64) (*OrderView, error) {
	// Hudud tekshiruvi: buyurtma kuryer ro'yxatida bo'lishi kerak.
	if _, err := s.GetCourierOrder(ctx, courierID, orderID); err != nil {
		return nil, err
	}
	view, err := s.repo.ClaimOrder(ctx, orderID, courierID)
	if err != nil {
		return nil, err
	}
	view.PickupCode = ""
	return view, nil
}

func (s *Service) DeliverCourierOrder(ctx context.Context, courierID, orderID int64, in DeliverInput) (*OrderView, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	view, err := s.repo.DeliverOrder(ctx, orderID, courierID, strings.TrimSpace(in.Code))
	if err != nil {
		return nil, err
	}
	_ = s.repo.EnsureSettings(ctx)
	if settings, sErr := s.repo.GetSettings(ctx); sErr == nil {
		_ = s.repo.CreateFinanceAccrualFromOrder(ctx, view, settings)
	}
	view.PickupCode = ""
	return view, nil
}

func (s *Service) ListFinanceAccruals(ctx context.Context, role string, paid *bool, limit, offset int) ([]FinanceAccrual, error) {
	return s.repo.ListFinanceAccruals(ctx, role, paid, limit, offset)
}

func (s *Service) GetFinanceStats(ctx context.Context) (*FinanceStats, error) {
	return s.repo.GetFinanceStats(ctx)
}

func (s *Service) MarkCourierPaid(ctx context.Context, in FinancePayInput) (int64, error) {
	if err := in.Validate(); err != nil {
		return 0, err
	}
	return s.repo.MarkCourierPaid(ctx, in.IDs)
}

func (s *Service) MarkKuratorPaid(ctx context.Context, in FinancePayInput) (int64, error) {
	if err := in.Validate(); err != nil {
		return 0, err
	}
	return s.repo.MarkKuratorPaid(ctx, in.IDs)
}
