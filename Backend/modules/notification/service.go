package notification

import (
	"context"
	"strings"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create yangi bildirishnoma yaratadi. Boshqa modullar (masalan order) import
// tsiklidan qochish uchun ushbu metodni Notifier interfeysi orqali chaqiradi.
func (s *Service) Create(ctx context.Context, recipientType string, recipientID int64, title, body, link string) error {
	recipientType = strings.TrimSpace(recipientType)
	if recipientType == "" {
		return validationError("recipient_type", "recipient_type kiritilishi shart")
	}
	if recipientID <= 0 {
		return validationError("recipient_id", "recipient_id musbat butun son bo'lishi kerak")
	}
	if strings.TrimSpace(title) == "" {
		return validationError("title", "title kiritilishi shart")
	}

	_, err := s.repo.Create(ctx, recipientType, recipientID, title, body, link)
	return err
}

func (s *Service) List(ctx context.Context, recipientType string, recipientID int64, limit, offset int) ([]Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListByRecipient(ctx, recipientType, recipientID, limit, offset)
}

func (s *Service) MarkRead(ctx context.Context, recipientType string, recipientID, id int64) (*Notification, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.RecipientType != recipientType || existing.RecipientID != recipientID {
		return nil, ErrForbidden
	}
	return s.repo.MarkRead(ctx, id)
}

func (s *Service) MarkAllRead(ctx context.Context, recipientType string, recipientID int64) error {
	return s.repo.MarkAllRead(ctx, recipientType, recipientID)
}
