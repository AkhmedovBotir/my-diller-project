package kurator

import (
	"context"
	"log/slog"
)

// recipient_type qiymati auth.Subject* konstantalari bilan mos keladi.
// Import tsiklidan qochish uchun bu yerda literal sifatida takrorlanadi.
const recipientAdmin = "admin"

// Notifier — kurator moduli tomonidan foydalaniladigan bildirishnoma
// interfeysi. notification.Service shu metod imzosiga mos keladi.
type Notifier interface {
	Create(ctx context.Context, recipientType string, recipientID int64, title, body, link string) error
}

type Service struct {
	repo     *Repository
	notifier Notifier
}

func NewService(repo *Repository, notifier Notifier) *Service {
	return &Service{repo: repo, notifier: notifier}
}

func (s *Service) notify(ctx context.Context, recipientID int64, title, body, link string) {
	if s.notifier == nil || recipientID <= 0 {
		return
	}
	if err := s.notifier.Create(ctx, recipientAdmin, recipientID, title, body, link); err != nil {
		slog.Error("Bildirishnoma yuborib bo'lmadi", "xatolik", err, "recipient_id", recipientID)
	}
}

// balance kuratorning joriy mavjud balansini hisoblaydi: jami daromad minus
// kutilayotgan va allaqachon to'langan yechish so'rovlari.
func (s *Service) balance(ctx context.Context, kuratorID int64) (totalEarned, withdrawn, balance float64, err error) {
	totalEarned, err = s.repo.sumDaromadlar(ctx, kuratorID)
	if err != nil {
		return 0, 0, 0, err
	}
	withdrawn, err = s.repo.sumSorovlar(ctx, kuratorID, []string{TolovStatusPending, TolovStatusPaid})
	if err != nil {
		return 0, 0, 0, err
	}
	return totalEarned, withdrawn, totalEarned - withdrawn, nil
}

func (s *Service) GetDaromadSummary(ctx context.Context, kuratorID int64, limit, offset int) (*DaromadSummary, error) {
	limit, offset = normalizePagination(limit, offset)

	totalEarned, withdrawn, bal, err := s.balance(ctx, kuratorID)
	if err != nil {
		return nil, err
	}

	items, err := s.repo.ListDaromadlar(ctx, kuratorID, limit, offset)
	if err != nil {
		return nil, err
	}

	return &DaromadSummary{
		Balance:               bal,
		TotalEarned:           totalEarned,
		TotalWithdrawnPending: withdrawn,
		Items:                 items,
	}, nil
}

func (s *Service) CreateTolovSorov(ctx context.Context, kuratorID int64, input CreateTolovSorovInput) (*TolovSorovi, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	_, _, bal, err := s.balance(ctx, kuratorID)
	if err != nil {
		return nil, err
	}
	if input.Amount > bal {
		return nil, ErrInsufficientBalance
	}

	return s.repo.CreateTolovSorov(ctx, kuratorID, input)
}

func (s *Service) ListTolovSorovlariByKurator(ctx context.Context, kuratorID int64, limit, offset int) ([]TolovSorovi, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListSorovlarByKurator(ctx, kuratorID, limit, offset)
}

func (s *Service) ListKomissiyalarForKurator(ctx context.Context, kuratorID int64, limit, offset int) ([]KomissiyaItem, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListKomissiyalarForKurator(ctx, kuratorID, limit, offset)
}

func (s *Service) ListTolovSorovlariForAdmin(ctx context.Context, status string, limit, offset int) ([]TolovSorovi, error) {
	if !validTolovStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListSorovlarAll(ctx, status, limit, offset)
}

func (s *Service) PayTolovSorovByAdmin(ctx context.Context, adminID, id int64) (*TolovSorovi, error) {
	existing, err := s.repo.GetSorovByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != TolovStatusPending {
		return nil, ErrBadStatus
	}

	updated, err := s.repo.PaySorov(ctx, id, adminID)
	if err != nil {
		return nil, err
	}

	s.notify(ctx, updated.KuratorID,
		"To'lov so'rovi to'landi",
		"Kartaga pul o'tkazish so'rovingiz admin tomonidan to'langan deb belgilandi",
		"/kurator/tolov-sorovlari",
	)

	return updated, nil
}

func (s *Service) RejectTolovSorovByAdmin(ctx context.Context, adminID, id int64, adminNote string) (*TolovSorovi, error) {
	existing, err := s.repo.GetSorovByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != TolovStatusPending {
		return nil, ErrBadStatus
	}

	updated, err := s.repo.RejectSorov(ctx, id, adminID, adminNote)
	if err != nil {
		return nil, err
	}

	s.notify(ctx, updated.KuratorID,
		"To'lov so'rovi rad etildi",
		"Kartaga pul o'tkazish so'rovingiz admin tomonidan rad etildi",
		"/kurator/tolov-sorovlari",
	)

	return updated, nil
}
