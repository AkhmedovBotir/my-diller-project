package birgaxarid

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"diller-backend/internal/pkg/auth"
	"diller-backend/modules/eskiz"
)

func normalizeUZPhone(phone string) string {
	digits := make([]rune, 0, 12)
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			digits = append(digits, r)
		}
	}
	s := string(digits)
	if strings.HasPrefix(s, "998") && len(s) == 12 {
		return "+" + s
	}
	if len(s) == 9 {
		return "+998" + s
	}
	if strings.HasPrefix(phone, "+998") && len(s) == 12 {
		return "+998" + s[3:]
	}
	if len(s) >= 12 {
		return "+998" + s[len(s)-9:]
	}
	return strings.TrimSpace(phone)
}

func birgaPhonePayload(phone string) []byte {
	raw, _ := json.Marshal(map[string]string{"phone": phone})
	return raw
}

func parseBirgaPhonePayload(payload []byte) (string, error) {
	var data struct {
		Phone string `json:"phone"`
	}
	if err := json.Unmarshal(payload, &data); err != nil || strings.TrimSpace(data.Phone) == "" {
		return "", eskiz.ErrChallengeNotFound
	}
	return normalizeUZPhone(data.Phone), nil
}

// AuthLogin telefon raqamiga My Diller login SMS (Eskiz) yuboradi.
func (s *Service) AuthLogin(ctx context.Context, phone string) (*eskiz.Challenge, error) {
	phone = normalizeUZPhone(phone)
	if len(phone) < 13 {
		return nil, validationError("phone", "Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)")
	}

	if c, err := s.repo.GetCustomerByPhone(ctx, phone); err == nil {
		if c.IsBlocked {
			return nil, validationError("phone", "Bu akkaunt bloklangan")
		}
	} else if err != ErrNotFound {
		return nil, err
	}

	if s.sms == nil {
		return nil, eskiz.ErrNotConfigured
	}

	return s.sms.Issue(ctx, eskiz.IssueInput{
		Phone:       phone,
		Purpose:     eskiz.PurposeLogin,
		SubjectType: auth.SubjectBirgaCustomer,
		Payload:     birgaPhonePayload(phone),
	})
}

// AuthVerify SMS kodni tekshirib JWT qaytaradi (yangi mijoz yaratiladi).
func (s *Service) AuthVerify(ctx context.Context, input eskiz.VerifyInput, jwtSecret string, ttl time.Duration) (*AuthStartResult, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if s.sms == nil {
		return nil, eskiz.ErrNotConfigured
	}

	otp, err := s.sms.Verify(ctx, input.ChallengeID, input.Code, eskiz.PurposeLogin, auth.SubjectBirgaCustomer)
	if err != nil {
		return nil, err
	}

	phone, err := parseBirgaPhonePayload(otp.Payload)
	if err != nil {
		return nil, err
	}

	c, err := s.repo.GetCustomerByPhone(ctx, phone)
	isNew := false
	if err != nil {
		if err != ErrNotFound {
			return nil, err
		}
		c, err = s.repo.CreateCustomer(ctx, CustomerInput{Phone: phone})
		if err != nil {
			return nil, err
		}
		isNew = true
	}
	if c.IsBlocked {
		return nil, validationError("phone", "Bu akkaunt bloklangan")
	}

	token, err := auth.GenerateToken(jwtSecret, ttl, c.ID, auth.SubjectBirgaCustomer, "")
	if err != nil {
		return nil, fmt.Errorf("token: %w", err)
	}
	return &AuthStartResult{Token: token, Customer: *c, IsNew: isNew}, nil
}

func (s *Service) AuthResendSMS(ctx context.Context, input eskiz.ResendInput) (*eskiz.Challenge, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if s.sms == nil {
		return nil, eskiz.ErrNotConfigured
	}
	return s.sms.Resend(ctx, input.ChallengeID, eskiz.PurposeLogin, auth.SubjectBirgaCustomer)
}

func (s *Service) CompleteProfile(ctx context.Context, customerID int64, in ProfileInput) (*Customer, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	current, err := s.repo.GetCustomer(ctx, customerID)
	if err != nil {
		return nil, err
	}
	return s.repo.UpdateCustomer(ctx, customerID, CustomerInput{
		Phone:      current.Phone,
		FirstName:  in.FirstName,
		LastName:   in.LastName,
		BirthDate:  in.BirthDate,
		RegionName: in.RegionName,
		CityName:   in.CityName,
		MfyName:    in.MfyName,
		Address:    in.Address,
		Lat:        current.Lat,
		Lng:        current.Lng,
	})
}

func (s *Service) GetCart(ctx context.Context, customerID int64) ([]CartItem, error) {
	return s.repo.ListCart(ctx, customerID)
}

func (s *Service) UpsertCartItem(ctx context.Context, customerID int64, in CartItemInput) ([]CartItem, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	gb, err := s.repo.GetGroupBuy(ctx, in.GroupBuyID)
	if err != nil {
		return nil, err
	}
	if gb.Status != "open" {
		return nil, validationError("group_buy_id", "Bu yig'im ochiq emas")
	}
	maxQty := gb.Stock - gb.CurrentVolume
	if maxQty < 1 {
		return nil, validationError("quantity", "Yig'imda joy qolmadi")
	}
	qty := in.Quantity
	if in.Add {
		existing, _ := s.repo.GetCartItem(ctx, customerID, in.GroupBuyID)
		if existing != nil {
			qty = existing.Quantity + in.Quantity
		}
	}
	if qty < 1 {
		_ = s.repo.DeleteCartItem(ctx, customerID, in.GroupBuyID)
		return s.repo.ListCart(ctx, customerID)
	}
	if qty > maxQty {
		qty = maxQty
	}
	if err := s.repo.UpsertCartItem(ctx, customerID, in.GroupBuyID, qty); err != nil {
		return nil, err
	}
	return s.repo.ListCart(ctx, customerID)
}

func (s *Service) DeleteCartItem(ctx context.Context, customerID, groupBuyID int64) ([]CartItem, error) {
	if err := s.repo.DeleteCartItem(ctx, customerID, groupBuyID); err != nil {
		return nil, err
	}
	return s.repo.ListCart(ctx, customerID)
}

func (s *Service) GetSettings(ctx context.Context) (*Settings, error) {
	_ = s.repo.EnsureSettings(ctx)
	return s.repo.GetSettings(ctx)
}

func (s *Service) UpdateSettings(ctx context.Context, in SettingsInput) (*Settings, error) {
	_ = s.repo.EnsureSettings(ctx)
	current, err := s.repo.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	// Platforma sozlamalaridan faqat min_order kelganda moliya maydonlarini saqlab qolamiz.
	if strings.TrimSpace(in.CourierFeeMode) == "" &&
		strings.TrimSpace(in.KuratorFeeMode) == "" &&
		in.CourierFeePercent == 0 && in.CourierFeeFixed == 0 &&
		in.KuratorFeePercent == 0 && in.KuratorFeeFixed == 0 {
		in.CourierFeeMode = current.CourierFeeMode
		in.CourierFeePercent = current.CourierFeePercent
		in.CourierFeeFixed = current.CourierFeeFixed
		in.KuratorFeeMode = current.KuratorFeeMode
		in.KuratorFeePercent = current.KuratorFeePercent
		in.KuratorFeeFixed = current.KuratorFeeFixed
	}
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.repo.UpdateSettings(ctx, in)
}

func (s *Service) Checkout(ctx context.Context, customerID int64, in CheckoutInput) ([]Order, error) {
	customer, err := s.repo.GetCustomer(ctx, customerID)
	if err != nil {
		return nil, err
	}
	if !customer.ProfileCompleted {
		return nil, validationError("profile", "Avval profilni to'ldiring")
	}

	type line struct {
		GroupBuyID int64
		Quantity   int
	}
	var lines []line

	if in.GroupBuyID != nil && *in.GroupBuyID > 0 {
		qty := in.Quantity
		if qty < 1 {
			qty = 1
		}
		lines = append(lines, line{GroupBuyID: *in.GroupBuyID, Quantity: qty})
	} else {
		cart, err := s.repo.ListCart(ctx, customerID)
		if err != nil {
			return nil, err
		}
		if len(cart) == 0 {
			return nil, validationError("cart", "Savat bo'sh")
		}
		for _, item := range cart {
			lines = append(lines, line{GroupBuyID: item.GroupBuyID, Quantity: item.Quantity})
		}
	}

	var totalAmount int64
	prepared := make([]struct {
		gb    *GroupBuy
		qty   int
		photo string
	}, 0, len(lines))

	for _, ln := range lines {
		gb, err := s.repo.GetGroupBuy(ctx, ln.GroupBuyID)
		if err != nil {
			return nil, err
		}
		if gb.Status != "open" {
			return nil, validationError("group_buy_id", "«"+gb.Title+"» yig'imi ochiq emas")
		}
		maxQty := gb.Stock - gb.CurrentVolume
		if ln.Quantity > maxQty {
			return nil, validationError("quantity", "«"+gb.Title+"» uchun yetarli joy yo'q")
		}
		photo := ""
		if len(gb.PhotoURLs) > 0 {
			photo = strings.TrimSpace(gb.PhotoURLs[0])
		}
		if photo == "" && len(gb.Items) > 0 {
			for _, it := range gb.Items {
				if u := strings.TrimSpace(it.PhotoURL); u != "" {
					photo = u
					break
				}
			}
		}
		if photo == "" && gb.ProductID != nil && *gb.ProductID > 0 {
			if p, err := s.repo.GetProduct(ctx, *gb.ProductID); err == nil && p != nil {
				photo = strings.TrimSpace(p.PhotoURL)
			}
		}
		totalAmount += gb.Price * int64(ln.Quantity)
		prepared = append(prepared, struct {
			gb    *GroupBuy
			qty   int
			photo string
		}{gb: gb, qty: ln.Quantity, photo: photo})
	}

	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		_ = s.repo.EnsureSettings(ctx)
		settings, err = s.repo.GetSettings(ctx)
		if err != nil {
			return nil, err
		}
	}
	if settings.MinOrderAmount > 0 && totalAmount < settings.MinOrderAmount {
		return nil, validationError(
			"amount",
			fmt.Sprintf("Minimal buyurtma summasi %d so'm. Hozirgi jami: %d so'm", settings.MinOrderAmount, totalAmount),
		)
	}

	orders := make([]Order, 0, len(prepared))
	for _, item := range prepared {
		o, err := s.repo.CreateOrder(ctx, OrderCreate{
			CustomerID:    customerID,
			GroupBuyID:    item.gb.ID,
			Quantity:      item.qty,
			UnitPrice:     item.gb.Price,
			TotalAmount:   item.gb.Price * int64(item.qty),
			TitleSnapshot: item.gb.Title,
			PhotoSnapshot: item.photo,
		})
		if err != nil {
			return nil, err
		}
		if err := s.repo.BumpGroupBuyVolume(ctx, item.gb.ID, item.qty); err != nil {
			return nil, err
		}
		_ = s.repo.DeleteCartItem(ctx, customerID, item.gb.ID)
		orders = append(orders, *o)
	}
	return orders, nil
}

func (s *Service) ListMyOrders(ctx context.Context, customerID int64, limit, offset int) ([]Order, error) {
	return s.repo.ListOrdersByCustomer(ctx, customerID, limit, offset)
}

func (s *Service) GetMyOrder(ctx context.Context, customerID, orderID int64) (*Order, error) {
	o, err := s.repo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if o.CustomerID != customerID {
		return nil, ErrNotFound
	}
	return o, nil
}

func (s *Service) CancelMyOrder(ctx context.Context, customerID, orderID int64) (*Order, error) {
	o, err := s.GetMyOrder(ctx, customerID, orderID)
	if err != nil {
		return nil, err
	}
	if o.Status != "collecting" {
		return nil, validationError("status", "Faqat yig'ilayotgan buyurtmani bekor qilish mumkin")
	}
	updated, err := s.repo.SetOrderStatus(ctx, orderID, "cancelled", "")
	if err != nil {
		return nil, err
	}
	_ = s.repo.BumpGroupBuyVolume(ctx, o.GroupBuyID, -o.Quantity)
	return updated, nil
}

