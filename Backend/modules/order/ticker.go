package order

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

const deadlineWatcherInterval = 1 * time.Minute

// StartDeadlineWatcher har daqiqada to'lov muddati 24 soat ichida
// tugaydigan buyurtmalarni tekshiradi, xaridor, ishlab chiqaruvchi va
// kuratorga ogohlantirish yuboradi hamda deadline_warned_at ni belgilaydi
// (bir marta yuborilishi uchun). ctx bekor qilinguncha davom etadi, shuning
// uchun app.go'da alohida goroutine sifatida ishga tushiriladi.
func (s *Service) StartDeadlineWatcher(ctx context.Context) {
	s.checkDeadlines(ctx)

	ticker := time.NewTicker(deadlineWatcherInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.checkDeadlines(ctx)
		}
	}
}

func (s *Service) checkDeadlines(ctx context.Context) {
	orders, err := s.repo.findUpcomingDeadlines(ctx)
	if err != nil {
		slog.Error("To'lov muddati kuzatuvchisi xatolik berdi", "xatolik", err)
		return
	}
	for _, o := range orders {
		s.warnDeadline(ctx, o)
	}
}

func (s *Service) warnDeadline(ctx context.Context, o Order) {
	deadlineText := ""
	if o.PaymentDeadlineAt != nil {
		deadlineText = o.PaymentDeadlineAt.Format("2006-01-02 15:04")
	}
	body := fmt.Sprintf("%s raqamli buyurtma bo'yicha to'lov muddati %s da tugaydi", o.Number, deadlineText)

	s.notify(ctx, recipientXaridor, o.XaridorID,
		"To'lov muddati yaqinlashmoqda", body, fmt.Sprintf("/xaridor/buyurtmalar/%d", o.ID))
	s.notify(ctx, recipientIshlabchiqaruvchi, o.IshlabchiqaruvchiID,
		"To'lov muddati yaqinlashmoqda", body, fmt.Sprintf("/ishlabchiqaruvchi/buyurtmalar/%d", o.ID))
	if o.KuratorID != nil {
		s.notify(ctx, recipientAdmin, *o.KuratorID,
			"To'lov muddati yaqinlashmoqda", body, fmt.Sprintf("/kurator/buyurtmalar/%d", o.ID))
	}

	if err := s.repo.setDeadlineWarned(ctx, o.ID); err != nil {
		slog.Error("deadline_warned_at ni belgilab bo'lmadi", "xatolik", err, "buyurtma_id", o.ID)
	}
}
