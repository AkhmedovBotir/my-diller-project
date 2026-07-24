package order

import (
	"context"
	"fmt"
	"log/slog"
	"mime/multipart"
	"time"

	"diller-backend/internal/pkg/upload"
)

// recipient_type qiymatlari (auth.Subject* konstantalari bilan mos).
// Import tsiklidan qochish uchun bu yerda literal sifatida takrorlanadi.
const (
	recipientAdmin             = "admin"
	recipientIshlabchiqaruvchi = "ishlabchiqaruvchi"
	recipientXaridor           = "xaridor"
)

// Notifier — order moduli tomonidan foydalaniladigan bildirishnoma interfeysi.
// notification.Service shu metod imzosiga mos keladi, shuning uchun import
// tsiklisiz to'g'ridan-to'g'ri ishlatilishi mumkin.
type Notifier interface {
	Create(ctx context.Context, recipientType string, recipientID int64, title, body, link string) error
}

type Service struct {
	repo     *Repository
	storage  *upload.Storage
	notifier Notifier
}

func NewService(repo *Repository, storage *upload.Storage, notifier Notifier) *Service {
	return &Service{repo: repo, storage: storage, notifier: notifier}
}

func (s *Service) notify(ctx context.Context, recipientType string, recipientID int64, title, body, link string) {
	if s.notifier == nil || recipientID <= 0 {
		return
	}
	if err := s.notifier.Create(ctx, recipientType, recipientID, title, body, link); err != nil {
		slog.Error("Bildirishnoma yuborib bo'lmadi", "xatolik", err, "recipient_type", recipientType, "recipient_id", recipientID)
	}
}

func (s *Service) uniqueOrderNumber(ctx context.Context) (string, error) {
	for i := 0; i < 20; i++ {
		number, err := GenerateOrderNumber()
		if err != nil {
			return "", err
		}
		exists, err := s.repo.orderNumberExists(ctx, number)
		if err != nil {
			return "", err
		}
		if !exists {
			return number, nil
		}
	}
	return "", fmt.Errorf("unikal buyurtma raqamini yaratib bo'lmadi, qayta urinib ko'ring")
}

func (s *Service) uniqueInvoiceNumber(ctx context.Context) (string, error) {
	for i := 0; i < 20; i++ {
		number, err := GenerateInvoiceNumber()
		if err != nil {
			return "", err
		}
		exists, err := s.repo.invoiceNumberExists(ctx, number)
		if err != nil {
			return "", err
		}
		if !exists {
			return number, nil
		}
	}
	return "", fmt.Errorf("unikal hisob-faktura raqamini yaratib bo'lmadi, qayta urinib ko'ring")
}

// initialPaymentPhase to'lov shartiga qarab buyurtma yaratilganda
// belgilanadigan boshlang'ich to'lov bosqichi va avans summasini qaytaradi.
func initialPaymentPhase(paymentTerm string, total float64) (phase string, advanceAmount float64) {
	switch paymentTerm {
	case PaymentTermPrepay100:
		return PaymentPhaseAwaitingAdvance, total
	case PaymentTermPodZakaz5050:
		return PaymentPhaseAwaitingAdvance, total / 2
	default: // PaymentTermDeferred
		return PaymentPhaseNone, 0
	}
}

// ---- Xaridor: buyurtma yaratish ----

func (s *Service) CreateOrder(ctx context.Context, xaridorID int64, input CreateOrderInput) (*Order, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	buyer, err := s.repo.getBuyer(ctx, s.repo.pool, xaridorID)
	if err != nil {
		return nil, err
	}
	if buyer.IsBlocked {
		return nil, ErrXaridorBlocked
	}

	// Bir xil mahsulot bir necha marta yuborilgan bo'lsa, miqdorlarni jamlaymiz.
	quantityByProduct := make(map[int64]int)
	ids := make([]int64, 0, len(input.Items))
	for _, item := range input.Items {
		if _, seen := quantityByProduct[item.ProductID]; !seen {
			ids = append(ids, item.ProductID)
		}
		quantityByProduct[item.ProductID] += item.Quantity
	}

	tx, err := s.repo.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("tranzaksiyani boshlab bo'lmadi: %w", err)
	}
	defer tx.Rollback(ctx)

	products, err := s.repo.getProductsForOrder(ctx, tx, ids)
	if err != nil {
		return nil, err
	}
	if len(products) != len(ids) {
		return nil, ErrProductNotFound
	}

	var (
		manufacturerID int64
		paymentTerm    string
		paymentDays    int
		total          float64
	)
	items := make([]OrderItem, 0, len(ids))

	for idx, id := range ids {
		p := products[id]
		if p.Status != productStatusApproved {
			return nil, ErrProductNotApproved
		}
		if idx == 0 {
			manufacturerID = p.IshlabchiqaruvchiID
			paymentTerm = p.PaymentTerm
			paymentDays = p.PaymentDays
		} else if p.IshlabchiqaruvchiID != manufacturerID {
			return nil, ErrMixedManufacturers
		} else if p.PaymentTerm != paymentTerm || p.PaymentDays != paymentDays {
			return nil, ErrMixedPaymentTerms
		}

		qty := quantityByProduct[id]
		if qty < p.MOQ {
			return nil, ErrQuantityBelowMOQ
		}
		if qty > p.Quantity {
			return nil, ErrInsufficientStock
		}

		lineTotal := p.Price * float64(qty)
		total += lineTotal
		items = append(items, OrderItem{
			ProductID:   p.ID,
			ProductCode: p.Code,
			ProductName: p.Name,
			UnitPrice:   p.Price,
			Quantity:    qty,
			MOQ:         p.MOQ,
			LineTotal:   lineTotal,
		})
	}

	for id, qty := range quantityByProduct {
		if err := s.repo.decrementProductStock(ctx, tx, id, qty); err != nil {
			return nil, err
		}
	}

	manufacturer, err := s.repo.getManufacturer(ctx, tx, manufacturerID)
	if err != nil {
		return nil, err
	}

	number, err := s.uniqueOrderNumber(ctx)
	if err != nil {
		return nil, err
	}
	invoiceNumber, err := s.uniqueInvoiceNumber(ctx)
	if err != nil {
		return nil, err
	}

	paymentPhase, advanceAmount := initialPaymentPhase(paymentTerm, total)

	params := insertOrderParams{
		Number:              number,
		XaridorID:           xaridorID,
		IshlabchiqaruvchiID: manufacturerID,
		KuratorID:           manufacturer.KuratorID,
		PaymentTerm:         paymentTerm,
		PaymentDays:         paymentDays,
		TotalAmount:         total,
		PointAAddress:       manufacturer.Address,
		PointALat:           manufacturer.Lat,
		PointALng:           manufacturer.Lng,
		PointBAddress:       buyer.Address,
		PointBLat:           buyer.Lat,
		PointBLng:           buyer.Lng,
		InvoiceNumber:       invoiceNumber,
		PaymentPhase:        paymentPhase,
		AdvanceAmount:       advanceAmount,
	}

	docOrder := &Order{
		Number:        number,
		InvoiceNumber: invoiceNumber,
		PaymentTerm:   paymentTerm,
		PaymentDays:   paymentDays,
		TotalAmount:   total,
		PointAAddress: params.PointAAddress,
		PointBAddress: params.PointBAddress,
	}
	params.ContractHTML = BuildContractHTML(docOrder, items, manufacturer, buyer, input.Note)
	params.InvoiceHTML = BuildInvoiceHTML(docOrder, items, manufacturer, buyer)

	created, err := s.repo.insertOrder(ctx, tx, params)
	if err != nil {
		return nil, err
	}

	savedItems := make([]OrderItem, 0, len(items))
	for _, it := range items {
		saved, err := s.repo.insertOrderItem(ctx, tx, created.ID, it)
		if err != nil {
			return nil, err
		}
		savedItems = append(savedItems, *saved)
	}
	created.Items = savedItems

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("tranzaksiyani yakunlab bo'lmadi: %w", err)
	}

	s.notify(ctx, recipientIshlabchiqaruvchi, manufacturer.ID,
		"Yangi buyurtma",
		fmt.Sprintf("Sizga %s raqamli yangi buyurtma tushdi", created.Number),
		fmt.Sprintf("/ishlabchiqaruvchi/buyurtmalar/%d", created.ID),
	)
	if manufacturer.KuratorID != nil {
		s.notify(ctx, recipientAdmin, *manufacturer.KuratorID,
			"Yangi buyurtma",
			fmt.Sprintf("Kuratorlik qilayotgan zavoddan %s raqamli yangi buyurtma tushdi", created.Number),
			fmt.Sprintf("/kurator/buyurtmalar/%d", created.ID),
		)
	}

	return created, nil
}

// ---- Xaridor: ko'rish va amallar ----

func (s *Service) ListByXaridor(ctx context.Context, xaridorID int64, status string, limit, offset int) ([]Order, error) {
	if !validStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListByXaridor(ctx, xaridorID, status, limit, offset)
}

func (s *Service) GetByXaridor(ctx context.Context, xaridorID, id int64) (*Order, error) {
	o, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o.XaridorID != xaridorID {
		return nil, ErrForbidden
	}
	return o, nil
}

// nextPhaseOnReceive xaridor buyurtmani qabul qilganda to'lov shartiga qarab
// keyingi to'lov bosqichini aniqlaydi: 100% oldindan to'lov avansi
// tasdiqlangan bo'lsa darhol "paid"ga o'tadi, aks holda yakuniy to'lov
// kutiladi ("awaiting_final").
func nextPhaseOnReceive(o *Order) string {
	switch o.PaymentTerm {
	case PaymentTermPrepay100:
		if o.PaymentPhase == PaymentPhaseAdvanceDone {
			return PaymentPhasePaid
		}
		return o.PaymentPhase
	default: // deferred, pod_zakaz_50_50
		if o.PaymentPhase == PaymentPhasePaid {
			return o.PaymentPhase
		}
		return PaymentPhaseAwaitingFinal
	}
}

func (s *Service) ReceiveByXaridor(ctx context.Context, xaridorID, id int64) (*Order, error) {
	existing, err := s.GetByXaridor(ctx, xaridorID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusYolda {
		return nil, ErrBadStatus
	}

	days := existing.PaymentDays
	if days < 1 {
		days = 1
	}
	deadline := time.Now().AddDate(0, 0, days)
	phase := nextPhaseOnReceive(existing)

	return s.repo.receive(ctx, id, deadline, phase)
}

// UploadReceiptByXaridor to'lov kvitansiyasini upload.Storage orqali saqlaydi.
func (s *Service) UploadReceiptByXaridor(ctx context.Context, xaridorID, id int64, file *multipart.FileHeader) (*Order, error) {
	existing, err := s.GetByXaridor(ctx, xaridorID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusYetkazildiTolovKutilmoqda {
		return nil, ErrBadStatus
	}

	urls, err := s.storage.SaveProductImages([]*multipart.FileHeader{file})
	if err != nil {
		return nil, validationError("receipt", err.Error())
	}

	return s.repo.setReceiptURL(ctx, id, urls[0])
}

// UploadAdvanceReceiptByXaridor avans (oldindan to'lov) kvitansiyasini saqlaydi.
// Faqat payment_phase=awaiting_advance holatida ruxsat etiladi.
func (s *Service) UploadAdvanceReceiptByXaridor(ctx context.Context, xaridorID, id int64, file *multipart.FileHeader) (*Order, error) {
	existing, err := s.GetByXaridor(ctx, xaridorID, id)
	if err != nil {
		return nil, err
	}
	if existing.PaymentPhase != PaymentPhaseAwaitingAdvance {
		return nil, ErrBadStatus
	}

	urls, err := s.storage.SaveProductImages([]*multipart.FileHeader{file})
	if err != nil {
		return nil, validationError("receipt", err.Error())
	}

	updated, err := s.repo.setAdvanceReceiptURL(ctx, id, urls[0])
	if err != nil {
		return nil, err
	}

	s.notify(ctx, recipientIshlabchiqaruvchi, updated.IshlabchiqaruvchiID,
		"Avans kvitansiyasi yuklandi",
		fmt.Sprintf("%s raqamli buyurtma bo'yicha xaridor avans kvitansiyasini yukladi", updated.Number),
		fmt.Sprintf("/ishlabchiqaruvchi/buyurtmalar/%d", updated.ID),
	)

	return updated, nil
}

// ---- Ishlab chiqaruvchi ----

func (s *Service) ListByManufacturer(ctx context.Context, ownerID int64, status string, limit, offset int) ([]Order, error) {
	if !validStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListByIshlabchiqaruvchi(ctx, ownerID, status, limit, offset)
}

func (s *Service) GetByManufacturer(ctx context.Context, ownerID, id int64) (*Order, error) {
	o, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o.IshlabchiqaruvchiID != ownerID {
		return nil, ErrForbidden
	}
	return o, nil
}

func (s *Service) AcceptByManufacturer(ctx context.Context, ownerID, id int64) (*Order, error) {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusYangi {
		return nil, ErrBadStatus
	}
	if existing.PaymentTerm == PaymentTermPrepay100 || existing.PaymentTerm == PaymentTermPodZakaz5050 {
		if existing.PaymentPhase != PaymentPhaseAdvanceDone {
			return nil, ErrAdvanceRequired
		}
	}
	return s.repo.accept(ctx, id)
}

// ConfirmAdvanceByManufacturer xaridor yuklagan avans kvitansiyasini ishlab
// chiqaruvchi tomonidan tasdiqlaydi: payment_phase awaiting_advance -> advance_done.
func (s *Service) ConfirmAdvanceByManufacturer(ctx context.Context, ownerID, id int64) (*Order, error) {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.PaymentPhase != PaymentPhaseAwaitingAdvance {
		return nil, ErrBadStatus
	}
	if existing.AdvanceReceiptURL == "" {
		return nil, ErrReceiptRequired
	}

	updated, err := s.repo.confirmAdvance(ctx, s.repo.pool, id)
	if err != nil {
		return nil, err
	}

	s.notify(ctx, recipientXaridor, updated.XaridorID,
		"Avans tasdiqlandi",
		fmt.Sprintf("%s raqamli buyurtma bo'yicha avans to'lovingiz ishlab chiqaruvchi tomonidan tasdiqlandi", updated.Number),
		fmt.Sprintf("/xaridor/buyurtmalar/%d", updated.ID),
	)

	return updated, nil
}

func (s *Service) ReadyByManufacturer(ctx context.Context, ownerID, id int64, input ReadyInput) (*Order, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusQabulQilindi {
		return nil, ErrBadStatus
	}

	dostavkaID := int64(0)
	if input.DostavkaID != nil {
		dostavkaID = *input.DostavkaID
	} else {
		picked, err := s.repo.getOldestDostavkaID(ctx, s.repo.pool)
		if err != nil {
			return nil, err
		}
		dostavkaID = picked
	}

	return s.repo.setReady(ctx, id, dostavkaID)
}

func (s *Service) ShipByManufacturer(ctx context.Context, ownerID, id int64) (*Order, error) {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusLogistikagaUzatildi || existing.PickedUpAt == nil {
		return nil, ErrBadStatus
	}
	return s.repo.ship(ctx, id)
}

func (s *Service) ConfirmPaymentByManufacturer(ctx context.Context, ownerID, id int64) (*Order, error) {
	existing, err := s.GetByManufacturer(ctx, ownerID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusYetkazildiTolovKutilmoqda {
		return nil, ErrBadStatus
	}

	tx, err := s.repo.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("tranzaksiyani boshlab bo'lmadi: %w", err)
	}
	defer tx.Rollback(ctx)

	updated, err := s.repo.confirmPayment(ctx, tx, id)
	if err != nil {
		return nil, err
	}

	if _, err := s.closeOrderWithCommission(ctx, tx, updated); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("tranzaksiyani yakunlab bo'lmadi: %w", err)
	}

	updated.Items, _ = s.repo.loadItems(ctx, s.repo.pool, updated.ID)
	return updated, nil
}

// closeOrderWithCommission platform_settings asosida komissiya yaratadi:
// agar bepul aksiya faol bo'lsa amount=0, status=waived; aks holda
// amount = total * percent/100, status=pending.
func (s *Service) closeOrderWithCommission(ctx context.Context, q querier, o *Order) (*Commission, error) {
	settings, err := s.repo.getSettings(ctx, q)
	if err != nil {
		return nil, err
	}

	c := Commission{
		BuyurtmaID:          o.ID,
		IshlabchiqaruvchiID: o.IshlabchiqaruvchiID,
		OrderAmount:         o.TotalAmount,
	}
	if settings.FreePromoActive {
		c.Percent = 0
		c.Amount = 0
		c.Status = CommissionStatusWaived
	} else {
		c.Percent = settings.CommissionPercent
		c.Amount = o.TotalAmount * settings.CommissionPercent / 100
		c.Status = CommissionStatusPending
	}

	manufacturer, err := s.repo.getManufacturer(ctx, q, o.IshlabchiqaruvchiID)
	if err != nil {
		return nil, err
	}
	c.InvoiceHTML = BuildCommissionInvoiceHTML(&c, o, manufacturer)

	return s.repo.createCommission(ctx, q, c)
}

// ---- Dostavka ----

func (s *Service) ListByDostavka(ctx context.Context, dostavkaID int64, limit, offset int) ([]Order, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListByDostavka(ctx, dostavkaID, limit, offset)
}

func (s *Service) GetByDostavka(ctx context.Context, dostavkaID, id int64) (*Order, error) {
	o, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o.DostavkaID == nil || *o.DostavkaID != dostavkaID {
		return nil, ErrForbidden
	}
	return o, nil
}

func (s *Service) PickupByDostavka(ctx context.Context, dostavkaID, id int64) (*Order, error) {
	existing, err := s.GetByDostavka(ctx, dostavkaID, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusLogistikagaUzatildi || existing.PickedUpAt != nil {
		return nil, ErrBadStatus
	}
	return s.repo.pickup(ctx, id)
}

func (s *Service) DeliverByDostavka(ctx context.Context, dostavkaID, id int64) (*Order, error) {
	existing, err := s.GetByDostavka(ctx, dostavkaID, id)
	if err != nil {
		return nil, err
	}
	if existing.PickedUpAt == nil || existing.DeliveredAt != nil {
		return nil, ErrBadStatus
	}
	return s.repo.deliver(ctx, id)
}

// ---- Kurator ----

func (s *Service) ListForKurator(ctx context.Context, subjectID int64, role, status string, limit, offset int) ([]Order, error) {
	if !validStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	if role == roleKurator {
		return s.repo.ListByKurator(ctx, subjectID, status, limit, offset)
	}
	return s.repo.ListAll(ctx, status, limit, offset)
}

func (s *Service) GetForKurator(ctx context.Context, subjectID int64, role string, id int64) (*Order, error) {
	o, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if role == roleKurator && (o.KuratorID == nil || *o.KuratorID != subjectID) {
		return nil, ErrForbidden
	}
	return o, nil
}

func (s *Service) ForceMajeureByKurator(ctx context.Context, subjectID int64, role string, id int64) (*Order, error) {
	existing, err := s.GetForKurator(ctx, subjectID, role, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusYetkazildiTolovKutilmoqda {
		return nil, ErrBadStatus
	}
	if existing.PaymentDeadlineAt == nil || !existing.PaymentDeadlineAt.Before(time.Now()) {
		return nil, ErrDeadlineNotPassed
	}
	if existing.PaidAt != nil {
		return nil, ErrAlreadyPaid
	}

	updated, err := s.repo.forceMajeure(ctx, id, subjectID)
	if err != nil {
		return nil, err
	}

	generalAdmins, err := s.repo.adminIDsByType(ctx, s.repo.pool, roleGeneral)
	if err == nil {
		for _, adminID := range generalAdmins {
			s.notify(ctx, recipientAdmin, adminID,
				"Fors-major holati",
				fmt.Sprintf("%s raqamli buyurtma bo'yicha to'lov muddati o'tdi, fors-major holati belgilandi", updated.Number),
				fmt.Sprintf("/admin/buyurtmalar/%d", updated.ID),
			)
		}
	}

	return updated, nil
}

// ---- Bosh admin ----

func (s *Service) ListForAdmin(ctx context.Context, status string, limit, offset int) ([]Order, error) {
	if !validStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListAll(ctx, status, limit, offset)
}

func (s *Service) GetForAdmin(ctx context.Context, id int64) (*Order, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GuaranteeByAdmin(ctx context.Context, adminID, id int64) (*Order, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != StatusForsMajor {
		return nil, ErrBadStatus
	}

	tx, err := s.repo.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("tranzaksiyani boshlab bo'lmadi: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.repo.deductReserve(ctx, tx, existing.TotalAmount); err != nil {
		return nil, err
	}

	updated, err := s.repo.guarantee(ctx, tx, id, adminID)
	if err != nil {
		return nil, err
	}

	reason := fmt.Sprintf("Kafolat to'lovi: %s raqamli buyurtma bo'yicha to'lov amalga oshirilmadi", updated.Number)
	if err := s.repo.blockXaridor(ctx, tx, updated.XaridorID, reason); err != nil {
		return nil, err
	}

	if _, err := s.repo.createDebt(ctx, tx, updated.XaridorID, updated.ID, updated.TotalAmount); err != nil {
		return nil, err
	}

	if _, err := s.closeOrderWithCommission(ctx, tx, updated); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("tranzaksiyani yakunlab bo'lmadi: %w", err)
	}

	updated.Items, _ = s.repo.loadItems(ctx, s.repo.pool, updated.ID)

	s.notify(ctx, recipientIshlabchiqaruvchi, updated.IshlabchiqaruvchiID,
		"Kafolat to'lovi amalga oshirildi",
		fmt.Sprintf("%s raqamli buyurtma bo'yicha kafolat to'lovi platforma tomonidan amalga oshirildi", updated.Number),
		fmt.Sprintf("/ishlabchiqaruvchi/buyurtmalar/%d", updated.ID),
	)

	return updated, nil
}

// ---- Komissiyalar ----

func (s *Service) ListCommissionsByManufacturer(ctx context.Context, ownerID int64, limit, offset int) ([]Commission, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListCommissionsByIshlabchiqaruvchi(ctx, ownerID, limit, offset)
}

// GetCommissionByManufacturer komissiyani ishlab chiqaruvchi egaligini
// tekshirib qaytaradi (masalan, komissiya hisob-fakturasini yuklab olish uchun).
func (s *Service) GetCommissionByManufacturer(ctx context.Context, ownerID, id int64) (*Commission, error) {
	c, err := s.repo.GetCommissionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.IshlabchiqaruvchiID != ownerID {
		return nil, ErrForbidden
	}
	return c, nil
}

func (s *Service) UploadCommissionReceiptByManufacturer(ctx context.Context, ownerID, id int64, file *multipart.FileHeader) (*Commission, error) {
	c, err := s.repo.GetCommissionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.IshlabchiqaruvchiID != ownerID {
		return nil, ErrForbidden
	}

	urls, err := s.storage.SaveProductImages([]*multipart.FileHeader{file})
	if err != nil {
		return nil, validationError("receipt", err.Error())
	}

	return s.repo.setCommissionReceiptURL(ctx, id, urls[0])
}

// MarkCommissionPaidByManufacturer — ishlab chiqaruvchi bank o'tkazmasidan
// so'ng o'zi to'langanini belgilaydi (kvitansiya oldindan yuklangan bo'lishi shart).
func (s *Service) MarkCommissionPaidByManufacturer(ctx context.Context, ownerID, id int64) (*Commission, error) {
	c, err := s.repo.GetCommissionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.IshlabchiqaruvchiID != ownerID {
		return nil, ErrForbidden
	}
	if c.Status != CommissionStatusPending {
		return nil, ErrBadStatus
	}
	if c.PaymentReceiptURL == "" {
		return nil, ErrReceiptRequired
	}
	return s.repo.markCommissionPaid(ctx, id)
}

func (s *Service) ListCommissionsForAdmin(ctx context.Context, status string, limit, offset int) ([]Commission, error) {
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListCommissionsAll(ctx, status, limit, offset)
}

// ConfirmCommissionPaidByAdmin — admin tomonidan yakuniy tasdiqlash, kvitansiya
// yuklanganligidan qat'iy nazar.
func (s *Service) ConfirmCommissionPaidByAdmin(ctx context.Context, id int64) (*Commission, error) {
	c, err := s.repo.GetCommissionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.Status != CommissionStatusPending {
		return nil, ErrBadStatus
	}
	return s.repo.markCommissionPaid(ctx, id)
}

// ---- Platforma sozlamalari ----

func (s *Service) GetSettings(ctx context.Context) (*PlatformSettings, error) {
	return s.repo.GetSettings(ctx)
}

func (s *Service) UpdateSettings(ctx context.Context, input UpdatePlatformSettingsInput) (*PlatformSettings, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateSettings(ctx, input)
}

// ---- Platforma qarzlari ----

func validDebtStatusFilter(status string) bool {
	switch status {
	case "", DebtStatusOpen, DebtStatusCollected, DebtStatusWrittenOff:
		return true
	default:
		return false
	}
}

func (s *Service) ListDebtsForAdmin(ctx context.Context, status string, limit, offset int) ([]PlatformDebt, error) {
	if !validDebtStatusFilter(status) {
		return nil, validationError("status", "status noto'g'ri")
	}
	limit, offset = normalizePagination(limit, offset)
	return s.repo.ListDebts(ctx, status, limit, offset)
}

func (s *Service) CollectDebtByAdmin(ctx context.Context, id int64, note string) (*PlatformDebt, error) {
	existing, err := s.repo.GetDebtByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != DebtStatusOpen {
		return nil, ErrDebtBadStatus
	}
	return s.repo.setDebtStatus(ctx, id, DebtStatusCollected, note)
}

func (s *Service) WriteOffDebtByAdmin(ctx context.Context, id int64) (*PlatformDebt, error) {
	existing, err := s.repo.GetDebtByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status != DebtStatusOpen {
		return nil, ErrDebtBadStatus
	}
	return s.repo.setDebtStatus(ctx, id, DebtStatusWrittenOff, "")
}

// ---- Kurator: hujjatlar ro'yxati ----

// ListDocumentsForKurator kurator (yoki bosh admin) uchun buyurtma hujjatlari
// bo'yicha qisqacha ro'yxatni qaytaradi.
func (s *Service) ListDocumentsForKurator(ctx context.Context, subjectID int64, role string, limit, offset int) ([]DocumentSummary, error) {
	limit, offset = normalizePagination(limit, offset)

	var (
		orders []Order
		err    error
	)
	if role == roleKurator {
		orders, err = s.repo.ListByKurator(ctx, subjectID, "", limit, offset)
	} else {
		orders, err = s.repo.ListAll(ctx, "", limit, offset)
	}
	if err != nil {
		return nil, err
	}

	items := make([]DocumentSummary, 0, len(orders))
	for _, o := range orders {
		items = append(items, DocumentSummary{
			ID:                  o.ID,
			Number:              o.Number,
			Status:              o.Status,
			ContractAvailable:   o.ContractHTML != "",
			InvoiceNumber:       o.InvoiceNumber,
			PaymentReceiptURL:   o.PaymentReceiptURL,
			AdvanceReceiptURL:   o.AdvanceReceiptURL,
			XaridorID:           o.XaridorID,
			IshlabchiqaruvchiID: o.IshlabchiqaruvchiID,
			CreatedAt:           o.CreatedAt,
		})
	}
	return items, nil
}

// ---- Bosh admin: fors-major xabarnomalari ----

func (s *Service) ForsMajorAlertsForAdmin(ctx context.Context) (*ForsMajorAlerts, error) {
	count, err := s.repo.countByStatus(ctx, StatusForsMajor)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListAll(ctx, StatusForsMajor, 10, 0)
	if err != nil {
		return nil, err
	}
	return &ForsMajorAlerts{Count: count, Items: items}, nil
}
