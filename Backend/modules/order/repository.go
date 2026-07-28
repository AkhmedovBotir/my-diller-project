package order

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const orderColumns = `
	id, number, xaridor_id, ishlabchiqaruvchi_id, dostavka_id, kurator_id, status,
	payment_term, payment_days, total_amount,
	point_a_address, point_a_lat, point_a_lng, point_b_address, point_b_lat, point_b_lng,
	contract_html, invoice_html, invoice_number, invoice_agreed_at, payment_receipt_url, payment_deadline_at,
	payment_phase, advance_amount, advance_receipt_url, advance_confirmed_at, deadline_warned_at,
	accepted_at, ready_at, picked_up_at, shipped_at, delivered_at, buyer_received_at, paid_at,
	force_majeure_at, force_majeure_by, guarantee_paid_at, guarantee_by,
	created_at, updated_at`

const itemColumns = `id, buyurtma_id, product_id, product_code, product_name, unit_price, quantity, moq, line_total`

const commissionColumns = `
	id, buyurtma_id, ishlabchiqaruvchi_id, order_amount, percent, amount,
	status, invoice_html, payment_receipt_url, paid_at, created_at, updated_at`

const debtColumns = `id, xaridor_id, buyurtma_id, amount, status, note, created_at, updated_at`

const shartnomaColumns = `id, xaridor_id, ishlabchiqaruvchi_id, contract_html, agreed_at, created_at`

// querier pgxpool.Pool va pgx.Tx uchun umumiy interfeys — bir xil metodlar
// tranzaksiya ichida ham, tashqarisida ham ishlatiladi.
type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Begin yangi tranzaksiya boshlaydi (buyurtma yaratish/yopish kabi
// bir nechta jadvalni birga o'zgartiradigan amallar uchun).
func (r *Repository) Begin(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}

func mapError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return fmt.Errorf("%s: raqam band, qayta urinib ko'ring: %w", action, err)
	}
	return fmt.Errorf("%s: %w", action, err)
}

// mapTransitionError holat almashtiruvchi so'rovlar uchun ishlatiladi: bu
// yerda 0 qator qaytishi odatda buyurtma holati mos kelmasligini bildiradi
// (mavjudligi allaqachon servis qatlamida tekshirilgan bo'ladi).
func mapTransitionError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBadStatus
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return validationError("dostavka_id", "Ko'rsatilgan dostavka kompaniyasi topilmadi")
	}
	return fmt.Errorf("%s: %w", action, err)
}

func mapCommissionError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrCommissionNotFound
	}
	return fmt.Errorf("%s: %w", action, err)
}

func mapCommissionTransitionError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBadStatus
	}
	return fmt.Errorf("%s: %w", action, err)
}

func scanOrder(row pgx.Row) (*Order, error) {
	var o Order
	err := row.Scan(
		&o.ID, &o.Number, &o.XaridorID, &o.IshlabchiqaruvchiID, &o.DostavkaID, &o.KuratorID, &o.Status,
		&o.PaymentTerm, &o.PaymentDays, &o.TotalAmount,
		&o.PointAAddress, &o.PointALat, &o.PointALng, &o.PointBAddress, &o.PointBLat, &o.PointBLng,
		&o.ContractHTML, &o.InvoiceHTML, &o.InvoiceNumber, &o.InvoiceAgreedAt, &o.PaymentReceiptURL, &o.PaymentDeadlineAt,
		&o.PaymentPhase, &o.AdvanceAmount, &o.AdvanceReceiptURL, &o.AdvanceConfirmedAt, &o.DeadlineWarnedAt,
		&o.AcceptedAt, &o.ReadyAt, &o.PickedUpAt, &o.ShippedAt, &o.DeliveredAt, &o.BuyerReceivedAt, &o.PaidAt,
		&o.ForceMajeureAt, &o.ForceMajeureBy, &o.GuaranteePaidAt, &o.GuaranteeBy,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func scanItem(row pgx.Row) (*OrderItem, error) {
	var it OrderItem
	err := row.Scan(
		&it.ID, &it.BuyurtmaID, &it.ProductID, &it.ProductCode, &it.ProductName,
		&it.UnitPrice, &it.Quantity, &it.MOQ, &it.LineTotal,
	)
	if err != nil {
		return nil, err
	}
	return &it, nil
}

func scanCommission(row pgx.Row) (*Commission, error) {
	var c Commission
	err := row.Scan(
		&c.ID, &c.BuyurtmaID, &c.IshlabchiqaruvchiID, &c.OrderAmount, &c.Percent, &c.Amount,
		&c.Status, &c.InvoiceHTML, &c.PaymentReceiptURL, &c.PaidAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanSettings(row pgx.Row) (*PlatformSettings, error) {
	var s PlatformSettings
	err := row.Scan(&s.ID, &s.CommissionPercent, &s.FreePromoActive, &s.ReserveBalance, &s.CuratorPercent, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func scanShartnoma(row pgx.Row) (*Shartnoma, error) {
	var s Shartnoma
	err := row.Scan(&s.ID, &s.XaridorID, &s.IshlabchiqaruvchiID, &s.ContractHTML, &s.AgreedAt, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func mapShartnomaError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrShartnomaNotFound
	}
	return fmt.Errorf("%s: %w", action, err)
}

func scanDebt(row pgx.Row) (*PlatformDebt, error) {
	var d PlatformDebt
	err := row.Scan(&d.ID, &d.XaridorID, &d.BuyurtmaID, &d.Amount, &d.Status, &d.Note, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// ---- buyurtma_mahsulotlari ----

func (r *Repository) loadItems(ctx context.Context, q querier, orderID int64) ([]OrderItem, error) {
	query := fmt.Sprintf(`SELECT %s FROM buyurtma_mahsulotlari WHERE buyurtma_id = $1 ORDER BY id`, itemColumns)

	rows, err := q.Query(ctx, query, orderID)
	if err != nil {
		return nil, fmt.Errorf("buyurtma mahsulotlarini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]OrderItem, 0)
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, fmt.Errorf("buyurtma mahsuloti ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *it)
	}
	return items, rows.Err()
}

func (r *Repository) attachItems(ctx context.Context, orders []Order) error {
	for i := range orders {
		items, err := r.loadItems(ctx, r.pool, orders[i].ID)
		if err != nil {
			return err
		}
		orders[i].Items = items
	}
	return nil
}

func (r *Repository) insertOrderItem(ctx context.Context, q querier, orderID int64, it OrderItem) (*OrderItem, error) {
	query := fmt.Sprintf(`
		INSERT INTO buyurtma_mahsulotlari (
			buyurtma_id, product_id, product_code, product_name, unit_price, quantity, moq, line_total
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING %s`, itemColumns)

	saved, err := scanItem(q.QueryRow(ctx, query,
		orderID, it.ProductID, it.ProductCode, it.ProductName, it.UnitPrice, it.Quantity, it.MOQ, it.LineTotal,
	))
	if err != nil {
		return nil, fmt.Errorf("buyurtma mahsulotini bazaga yozib bo'lmadi: %w", err)
	}
	return saved, nil
}

// ---- buyurtmalar: CRUD va ro'yxatlar ----

func (r *Repository) GetByID(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`SELECT %s FROM buyurtmalar WHERE id = $1`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "buyurtmani olib bo'lmadi")
	}

	items, err := r.loadItems(ctx, r.pool, id)
	if err != nil {
		return nil, err
	}
	o.Items = items
	return o, nil
}

func collectOrders(rows pgx.Rows) ([]Order, error) {
	orders := make([]Order, 0)
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, fmt.Errorf("buyurtma ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		orders = append(orders, *o)
	}
	return orders, rows.Err()
}

// list umumiy filtr shart (masalan "xaridor_id = $1"), status va pagination
// bilan buyurtmalar ro'yxatini qaytaradi.
func (r *Repository) list(ctx context.Context, baseCondition string, baseArgs []any, status string, limit, offset int) ([]Order, error) {
	args := append([]any{}, baseArgs...)
	where := ""
	if baseCondition != "" {
		where = "WHERE " + baseCondition
	}
	if status != "" {
		args = append(args, status)
		if where == "" {
			where = fmt.Sprintf("WHERE status = $%d", len(args))
		} else {
			where += fmt.Sprintf(" AND status = $%d", len(args))
		}
	}
	args = append(args, limit, offset)

	query := fmt.Sprintf(`
		SELECT %s FROM buyurtmalar
		%s
		ORDER BY id DESC LIMIT $%d OFFSET $%d`, orderColumns, where, len(args)-1, len(args))

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("buyurtmalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	orders, err := collectOrders(rows)
	if err != nil {
		return nil, err
	}
	if err := r.attachItems(ctx, orders); err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *Repository) ListByXaridor(ctx context.Context, xaridorID int64, status string, limit, offset int) ([]Order, error) {
	return r.list(ctx, "xaridor_id = $1", []any{xaridorID}, status, limit, offset)
}

func (r *Repository) ListByIshlabchiqaruvchi(ctx context.Context, id int64, status string, limit, offset int) ([]Order, error) {
	return r.list(ctx, "ishlabchiqaruvchi_id = $1", []any{id}, status, limit, offset)
}

func (r *Repository) ListByKurator(ctx context.Context, kuratorID int64, status string, limit, offset int) ([]Order, error) {
	return r.list(ctx, "kurator_id = $1", []any{kuratorID}, status, limit, offset)
}

func (r *Repository) ListAll(ctx context.Context, status string, limit, offset int) ([]Order, error) {
	return r.list(ctx, "", nil, status, limit, offset)
}

func (r *Repository) ListByDostavka(ctx context.Context, id int64, limit, offset int) ([]Order, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM buyurtmalar
		WHERE dostavka_id = $1 AND status IN ($2, $3, $4)
		ORDER BY id DESC LIMIT $5 OFFSET $6`, orderColumns)

	rows, err := r.pool.Query(ctx, query,
		id, StatusLogistikagaUzatildi, StatusYolda, StatusYetkazildiTolovKutilmoqda, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("buyurtmalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	orders, err := collectOrders(rows)
	if err != nil {
		return nil, err
	}
	if err := r.attachItems(ctx, orders); err != nil {
		return nil, err
	}
	return orders, nil
}

// ---- buyurtma yaratish uchun yordamchi tuzilmalar ----

type productSnapshot struct {
	ID                  int64
	IshlabchiqaruvchiID int64
	Code                string
	Name                string
	Price               float64
	Quantity            int
	MOQ                 int
	Status              string
	PaymentTerm         string
	PaymentDays         int
}

// getProductsForOrder berilgan ID'lar bo'yicha mahsulotlarni FOR UPDATE bilan
// qulflab o'qiydi (bir vaqtda bir nechta buyurtma bitta mahsulotni band
// qilishining oldini olish uchun). Chaqiruvchi tranzaksiya (pgx.Tx) berishi kerak.
func (r *Repository) getProductsForOrder(ctx context.Context, q querier, ids []int64) (map[int64]productSnapshot, error) {
	rows, err := q.Query(ctx, `
		SELECT id, ishlabchiqaruvchi_id, code, name, price, quantity, moq, status, payment_term, payment_days
		FROM products
		WHERE id = ANY($1) AND deleted_at IS NULL
		FOR UPDATE`, ids,
	)
	if err != nil {
		return nil, fmt.Errorf("mahsulotlarni olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	result := make(map[int64]productSnapshot)
	for rows.Next() {
		var p productSnapshot
		if err := rows.Scan(
			&p.ID, &p.IshlabchiqaruvchiID, &p.Code, &p.Name, &p.Price,
			&p.Quantity, &p.MOQ, &p.Status, &p.PaymentTerm, &p.PaymentDays,
		); err != nil {
			return nil, fmt.Errorf("mahsulot ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		result[p.ID] = p
	}
	return result, rows.Err()
}

func (r *Repository) decrementProductStock(ctx context.Context, q querier, productID int64, qty int) error {
	tag, err := q.Exec(ctx, `
		UPDATE products SET quantity = quantity - $1, updated_at = now()
		WHERE id = $2 AND quantity >= $1`, qty, productID,
	)
	if err != nil {
		return fmt.Errorf("mahsulot qoldig'ini kamaytirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrInsufficientStock
	}
	return nil
}

type manufacturerInfo struct {
	ID          int64
	CompanyName string
	FirstName   string
	LastName    string
	Phone       string
	Address     string
	Lat         *float64
	Lng         *float64
	STIR        string
	BankAccount string
	BankName    string
	MFO         string
	KuratorID   *int64
}

// ProfileComplete ishlab chiqaruvchi profilining buyurtma qabul qilish
// uchun to'liq to'ldirilganligini tekshiradi.
func (m *manufacturerInfo) ProfileComplete() bool {
	return m.CompanyName != "" && m.FirstName != "" && m.LastName != "" && m.Phone != "" &&
		m.STIR != "" && m.BankAccount != "" && m.BankName != "" && m.MFO != "" && m.Address != "" &&
		m.Lat != nil && m.Lng != nil
}

func (r *Repository) getManufacturer(ctx context.Context, q querier, id int64) (*manufacturerInfo, error) {
	var m manufacturerInfo
	err := q.QueryRow(ctx, `
		SELECT id, company_name, first_name, last_name, phone, address, lat, lng, stir, bank_account, bank_name, mfo, kurator_id
		FROM ishlabchiqaruvchilar WHERE id = $1`, id,
	).Scan(&m.ID, &m.CompanyName, &m.FirstName, &m.LastName, &m.Phone, &m.Address, &m.Lat, &m.Lng, &m.STIR, &m.BankAccount, &m.BankName, &m.MFO, &m.KuratorID)
	if err != nil {
		return nil, mapError(err, "ishlab chiqaruvchini olib bo'lmadi")
	}
	return &m, nil
}

type buyerInfo struct {
	ID          int64
	ShopName    string
	FirstName   string
	LastName    string
	Phone       string
	Address     string
	Lat         *float64
	Lng         *float64
	STIR        string
	BankAccount string
	BankName    string
	MFO         string
	IsBlocked   bool
}

// ProfileComplete xaridor profilining buyurtma berish uchun to'liq
// to'ldirilganligini tekshiradi.
func (b *buyerInfo) ProfileComplete() bool {
	return b.ShopName != "" && b.STIR != "" && b.BankAccount != "" && b.BankName != "" && b.MFO != "" &&
		b.Address != "" && b.Lat != nil && b.Lng != nil
}

func (r *Repository) getBuyer(ctx context.Context, q querier, id int64) (*buyerInfo, error) {
	var b buyerInfo
	err := q.QueryRow(ctx, `
		SELECT id, shop_name, first_name, last_name, phone, address, lat, lng, stir, bank_account, bank_name, mfo, is_blocked
		FROM xaridorlar WHERE id = $1`, id,
	).Scan(&b.ID, &b.ShopName, &b.FirstName, &b.LastName, &b.Phone, &b.Address, &b.Lat, &b.Lng, &b.STIR, &b.BankAccount, &b.BankName, &b.MFO, &b.IsBlocked)
	if err != nil {
		return nil, mapError(err, "xaridorni olib bo'lmadi")
	}
	return &b, nil
}

func (r *Repository) blockXaridor(ctx context.Context, q querier, id int64, reason string) error {
	_, err := q.Exec(ctx, `
		UPDATE xaridorlar SET is_blocked = TRUE, blocked_reason = $1, updated_at = now()
		WHERE id = $2`, reason, id,
	)
	if err != nil {
		return fmt.Errorf("xaridorni bloklab bo'lmadi: %w", err)
	}
	return nil
}

func (r *Repository) getOldestDostavkaID(ctx context.Context, q querier) (int64, error) {
	var id int64
	err := q.QueryRow(ctx, `SELECT id FROM dostavka_kompaniyalari ORDER BY id ASC LIMIT 1`).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNoDostavka
		}
		return 0, fmt.Errorf("dostavka kompaniyasini olib bo'lmadi: %w", err)
	}
	return id, nil
}

func (r *Repository) adminIDsByType(ctx context.Context, q querier, adminType string) ([]int64, error) {
	rows, err := q.Query(ctx, `SELECT id FROM admins WHERE type = $1`, adminType)
	if err != nil {
		return nil, fmt.Errorf("adminlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("admin ID sini o'qib bo'lmadi: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *Repository) orderNumberExists(ctx context.Context, number string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM buyurtmalar WHERE number = $1)`, number).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("buyurtma raqamini tekshirib bo'lmadi: %w", err)
	}
	return exists, nil
}

func (r *Repository) invoiceNumberExists(ctx context.Context, number string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM buyurtmalar WHERE invoice_number = $1)`, number).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("hisob-faktura raqamini tekshirib bo'lmadi: %w", err)
	}
	return exists, nil
}

type insertOrderParams struct {
	Number              string
	XaridorID           int64
	IshlabchiqaruvchiID int64
	KuratorID           *int64
	PaymentTerm         string
	PaymentDays         int
	TotalAmount         float64
	PointAAddress       string
	PointALat           *float64
	PointALng           *float64
	PointBAddress       string
	PointBLat           *float64
	PointBLng           *float64
	ContractHTML        string
	InvoiceHTML         string
	InvoiceNumber       string
	PaymentPhase        string
	AdvanceAmount       float64
}

func (r *Repository) insertOrder(ctx context.Context, q querier, in insertOrderParams) (*Order, error) {
	query := fmt.Sprintf(`
		INSERT INTO buyurtmalar (
			number, xaridor_id, ishlabchiqaruvchi_id, kurator_id, status,
			payment_term, payment_days, total_amount,
			point_a_address, point_a_lat, point_a_lng, point_b_address, point_b_lat, point_b_lng,
			contract_html, invoice_html, invoice_number,
			payment_phase, advance_amount
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query,
		in.Number, in.XaridorID, in.IshlabchiqaruvchiID, in.KuratorID, StatusYangi,
		in.PaymentTerm, in.PaymentDays, in.TotalAmount,
		in.PointAAddress, in.PointALat, in.PointALng, in.PointBAddress, in.PointBLat, in.PointBLng,
		in.ContractHTML, in.InvoiceHTML, in.InvoiceNumber,
		in.PaymentPhase, in.AdvanceAmount,
	))
	if err != nil {
		return nil, mapError(err, "buyurtmani bazaga yozib bo'lmadi")
	}
	return o, nil
}

// ---- holat almashtiruvchi amallar ----

func (r *Repository) accept(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, accepted_at = now(), updated_at = now()
		WHERE id = $2 AND status = $3
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusQabulQilindi, id, StatusYangi))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtmani qabul qilib bo'lmadi")
	}
	return o, nil
}

func (r *Repository) setReady(ctx context.Context, id, dostavkaID int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, dostavka_id = $2, ready_at = now(), updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusLogistikagaUzatildi, dostavkaID, id, StatusQabulQilindi))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtmani logistikaga uzatib bo'lmadi")
	}
	return o, nil
}

// setReadyAwaitingFinalPayment pod_zakaz_50_50 to'lov sharti uchun: mahsulot
// tayyor, lekin logistikaga uzatilmaydi — avval xaridordan yakuniy (ikkinchi)
// to'lov kutiladi. Muddat (deadline) belgilanmaydi.
func (r *Repository) setReadyAwaitingFinalPayment(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar
		SET status = $1, payment_phase = $2, ready_at = now(), updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusTayyorTolovKutilmoqda, PaymentPhaseAwaitingFinal, id, StatusQabulQilindi))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtmani yakuniy to'lov kutish holatiga o'tkazib bo'lmadi")
	}
	return o, nil
}

// confirmFinalAndSendToLogistics pod_zakaz_50_50 ikkinchi (yakuniy) to'lovi
// tasdiqlanganidan keyin buyurtmani darhol logistikaga uzatadi.
func (r *Repository) confirmFinalAndSendToLogistics(ctx context.Context, q querier, id, dostavkaID int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar
		SET status = $1, dostavka_id = $2, payment_phase = $3, updated_at = now()
		WHERE id = $4 AND status = $5
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query, StatusLogistikagaUzatildi, dostavkaID, PaymentPhasePaid, id, StatusTayyorTolovKutilmoqda))
	if err != nil {
		return nil, mapTransitionError(err, "yakuniy to'lovni tasdiqlab, logistikaga uzatib bo'lmadi")
	}
	return o, nil
}

func (r *Repository) ship(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, shipped_at = now(), updated_at = now()
		WHERE id = $2 AND status = $3 AND picked_up_at IS NOT NULL
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusYolda, id, StatusLogistikagaUzatildi))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtmani jo'natib bo'lmadi")
	}
	return o, nil
}

func (r *Repository) confirmPayment(ctx context.Context, q querier, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, paid_at = now(), payment_phase = $2, updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query, StatusYakunlandi, PaymentPhasePaid, id, StatusYetkazildiTolovKutilmoqda))
	if err != nil {
		return nil, mapTransitionError(err, "to'lovni tasdiqlab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) receive(ctx context.Context, id int64, deadline *time.Time, phase string) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar
		SET status = $1, buyer_received_at = now(), payment_deadline_at = $2, payment_phase = $3,
		    invoice_agreed_at = COALESCE(invoice_agreed_at, now()), updated_at = now()
		WHERE id = $4 AND status = $5
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusYetkazildiTolovKutilmoqda, deadline, phase, id, StatusYolda))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtma qabul qilinganini belgilab bo'lmadi")
	}
	return o, nil
}

// receiveAndClose — pod_zakaz_50_50 uchun: ikkinchi to'lov allaqachon
// yakuniy to'lov sifatida tasdiqlangan bo'lsa, xaridor qabul qilganda
// buyurtma darhol yakunlanadi (to'lov muddati kerak emas).
func (r *Repository) receiveAndClose(ctx context.Context, q querier, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar
		SET status = $1, buyer_received_at = now(), payment_deadline_at = NULL, paid_at = now(),
		    invoice_agreed_at = COALESCE(invoice_agreed_at, now()), updated_at = now()
		WHERE id = $2 AND status = $3
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query, StatusYakunlandi, id, StatusYolda))
	if err != nil {
		return nil, mapTransitionError(err, "buyurtmani yakunlab bo'lmadi")
	}
	return o, nil
}

// agreeInvoice xaridor tomonidan hisob-fakturani alohida tasdiqlashi uchun
// (odatda receive bilan birga avtomatik belgilanadi, lekin alohida endpoint
// ham mavjud).
func (r *Repository) agreeInvoice(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET invoice_agreed_at = COALESCE(invoice_agreed_at, now()), updated_at = now()
		WHERE id = $1
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "hisob-fakturani tasdiqlab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) setReceiptURL(ctx context.Context, id int64, url string) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET payment_receipt_url = $1, updated_at = now()
		WHERE id = $2
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, url, id))
	if err != nil {
		return nil, mapError(err, "to'lov kvitansiyasini saqlab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) setAdvanceReceiptURL(ctx context.Context, id int64, url string) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET advance_receipt_url = $1, updated_at = now()
		WHERE id = $2
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, url, id))
	if err != nil {
		return nil, mapError(err, "avans kvitansiyasini saqlab bo'lmadi")
	}
	return o, nil
}

// clearAdvanceReceiptURL ishlab chiqaruvchi avans kvitansiyasini rad etganda
// xaridorga qayta yuklash imkonini berish uchun URL'ni tozalaydi.
func (r *Repository) clearAdvanceReceiptURL(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET advance_receipt_url = '', updated_at = now()
		WHERE id = $1
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "avans kvitansiyasini rad etib bo'lmadi")
	}
	return o, nil
}

// clearPaymentReceiptURL ishlab chiqaruvchi to'lov kvitansiyasini rad
// etganda xaridorga qayta yuklash imkonini berish uchun URL'ni tozalaydi.
func (r *Repository) clearPaymentReceiptURL(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET payment_receipt_url = '', updated_at = now()
		WHERE id = $1
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "to'lov kvitansiyasini rad etib bo'lmadi")
	}
	return o, nil
}

func (r *Repository) confirmAdvance(ctx context.Context, q querier, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET payment_phase = $1, advance_confirmed_at = now(), updated_at = now()
		WHERE id = $2 AND payment_phase = $3
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query, PaymentPhaseAdvanceDone, id, PaymentPhaseAwaitingAdvance))
	if err != nil {
		return nil, mapTransitionError(err, "avansni tasdiqlab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) pickup(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET picked_up_at = now(), updated_at = now()
		WHERE id = $1 AND status = $2 AND picked_up_at IS NULL
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id, StatusLogistikagaUzatildi))
	if err != nil {
		return nil, mapTransitionError(err, "yuk olinganini belgilab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) deliver(ctx context.Context, id int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET delivered_at = now(), updated_at = now()
		WHERE id = $1 AND picked_up_at IS NOT NULL AND delivered_at IS NULL
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapTransitionError(err, "yetkazilganini belgilab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) forceMajeure(ctx context.Context, id, adminID int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, force_majeure_at = now(), force_majeure_by = $2, updated_at = now()
		WHERE id = $3 AND status = $4 AND payment_deadline_at < now() AND paid_at IS NULL
		RETURNING %s`, orderColumns)

	o, err := scanOrder(r.pool.QueryRow(ctx, query, StatusForsMajor, adminID, id, StatusYetkazildiTolovKutilmoqda))
	if err != nil {
		return nil, mapTransitionError(err, "fors-major holatini belgilab bo'lmadi")
	}
	return o, nil
}

func (r *Repository) guarantee(ctx context.Context, q querier, id, adminID int64) (*Order, error) {
	query := fmt.Sprintf(`
		UPDATE buyurtmalar SET status = $1, guarantee_paid_at = now(), guarantee_by = $2, updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, orderColumns)

	o, err := scanOrder(q.QueryRow(ctx, query, StatusKafolatBilanYopildi, adminID, id, StatusForsMajor))
	if err != nil {
		return nil, mapTransitionError(err, "kafolatni yopib bo'lmadi")
	}
	return o, nil
}

// ---- platform_settings ----

func (r *Repository) getSettings(ctx context.Context, q querier) (*PlatformSettings, error) {
	s, err := scanSettings(q.QueryRow(ctx, `
		SELECT id, commission_percent, free_promo_active, reserve_balance, curator_percent, updated_at
		FROM platform_settings ORDER BY id LIMIT 1`))
	if err != nil {
		return nil, mapError(err, "platforma sozlamalarini olib bo'lmadi")
	}
	return s, nil
}

func (r *Repository) GetSettings(ctx context.Context) (*PlatformSettings, error) {
	return r.getSettings(ctx, r.pool)
}

func (r *Repository) UpdateSettings(ctx context.Context, input UpdatePlatformSettingsInput) (*PlatformSettings, error) {
	s, err := scanSettings(r.pool.QueryRow(ctx, `
		UPDATE platform_settings
		SET commission_percent = $1, free_promo_active = $2, reserve_balance = $3, curator_percent = $4, updated_at = now()
		WHERE id = (SELECT id FROM platform_settings ORDER BY id LIMIT 1)
		RETURNING id, commission_percent, free_promo_active, reserve_balance, curator_percent, updated_at`,
		input.CommissionPercent, input.FreePromoActive, input.ReserveBalance, input.CuratorPercent,
	))
	if err != nil {
		return nil, mapError(err, "platforma sozlamalarini yangilab bo'lmadi")
	}
	return s, nil
}

func (r *Repository) deductReserve(ctx context.Context, q querier, amount float64) error {
	tag, err := q.Exec(ctx, `
		UPDATE platform_settings SET reserve_balance = reserve_balance - $1, updated_at = now()
		WHERE id = (SELECT id FROM platform_settings ORDER BY id LIMIT 1) AND reserve_balance >= $1`, amount,
	)
	if err != nil {
		return fmt.Errorf("zaxira balansni kamaytirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrInsufficientReserve
	}
	return nil
}

// ---- komissiyalar ----

func (r *Repository) createCommission(ctx context.Context, q querier, c Commission) (*Commission, error) {
	query := fmt.Sprintf(`
		INSERT INTO komissiyalar (buyurtma_id, ishlabchiqaruvchi_id, order_amount, percent, amount, status, invoice_html)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING %s`, commissionColumns)

	saved, err := scanCommission(q.QueryRow(ctx, query,
		c.BuyurtmaID, c.IshlabchiqaruvchiID, c.OrderAmount, c.Percent, c.Amount, c.Status, c.InvoiceHTML,
	))
	if err != nil {
		return nil, mapError(err, "komissiyani bazaga yozib bo'lmadi")
	}
	return saved, nil
}

func (r *Repository) GetCommissionByID(ctx context.Context, id int64) (*Commission, error) {
	query := fmt.Sprintf(`SELECT %s FROM komissiyalar WHERE id = $1`, commissionColumns)

	c, err := scanCommission(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapCommissionError(err, "komissiyani olib bo'lmadi")
	}
	return c, nil
}

func collectCommissions(rows pgx.Rows) ([]Commission, error) {
	items := make([]Commission, 0)
	for rows.Next() {
		c, err := scanCommission(rows)
		if err != nil {
			return nil, fmt.Errorf("komissiya ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *c)
	}
	return items, rows.Err()
}

func (r *Repository) ListCommissionsByIshlabchiqaruvchi(ctx context.Context, id int64, limit, offset int) ([]Commission, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM komissiyalar WHERE ishlabchiqaruvchi_id = $1
		ORDER BY id DESC LIMIT $2 OFFSET $3`, commissionColumns)

	rows, err := r.pool.Query(ctx, query, id, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("komissiyalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectCommissions(rows)
}

func (r *Repository) ListCommissionsAll(ctx context.Context, status string, limit, offset int) ([]Commission, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != "" {
		query := fmt.Sprintf(`SELECT %s FROM komissiyalar WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`, commissionColumns)
		rows, err = r.pool.Query(ctx, query, status, limit, offset)
	} else {
		query := fmt.Sprintf(`SELECT %s FROM komissiyalar ORDER BY id DESC LIMIT $1 OFFSET $2`, commissionColumns)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("komissiyalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectCommissions(rows)
}

// setCommissionReceiptURLAndSubmit ishlab chiqaruvchi kvitansiya yuklaganda
// komissiyani "submitted" holatiga o'tkazadi — yakuniy tasdiqni faqat admin
// bera oladi.
func (r *Repository) setCommissionReceiptURLAndSubmit(ctx context.Context, id int64, url string) (*Commission, error) {
	query := fmt.Sprintf(`
		UPDATE komissiyalar SET payment_receipt_url = $1, status = $2, updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, commissionColumns)

	c, err := scanCommission(r.pool.QueryRow(ctx, query, url, CommissionStatusSubmitted, id, CommissionStatusPending))
	if err != nil {
		return nil, mapCommissionTransitionError(err, "komissiya kvitansiyasini yuklab bo'lmadi")
	}
	return c, nil
}

func (r *Repository) markCommissionPaid(ctx context.Context, id int64, fromStatus string) (*Commission, error) {
	query := fmt.Sprintf(`
		UPDATE komissiyalar SET status = $1, paid_at = now(), updated_at = now()
		WHERE id = $2 AND status = $3
		RETURNING %s`, commissionColumns)

	c, err := scanCommission(r.pool.QueryRow(ctx, query, CommissionStatusPaid, id, fromStatus))
	if err != nil {
		return nil, mapCommissionTransitionError(err, "komissiyani to'langan deb belgilab bo'lmadi")
	}
	return c, nil
}

// rejectCommission admin tomonidan rad etilgan komissiyani qayta to'lash
// uchun "pending" holatiga qaytaradi va eski kvitansiyani tozalaydi.
func (r *Repository) rejectCommission(ctx context.Context, id int64) (*Commission, error) {
	query := fmt.Sprintf(`
		UPDATE komissiyalar SET status = $1, payment_receipt_url = '', updated_at = now()
		WHERE id = $2 AND status = $3
		RETURNING %s`, commissionColumns)

	c, err := scanCommission(r.pool.QueryRow(ctx, query, CommissionStatusPending, id, CommissionStatusSubmitted))
	if err != nil {
		return nil, mapCommissionTransitionError(err, "komissiyani rad etib bo'lmadi")
	}
	return c, nil
}

// ---- to'lov muddati kuzatuvchisi ----

// findUpcomingDeadlines to'lov muddati 24 soat ichida tugaydigan, hali
// to'lanmagan va oldin ogohlantirilmagan buyurtmalarni qaytaradi.
func (r *Repository) findUpcomingDeadlines(ctx context.Context) ([]Order, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM buyurtmalar
		WHERE status = $1
		  AND payment_deadline_at IS NOT NULL
		  AND payment_deadline_at < now() + interval '24 hours'
		  AND paid_at IS NULL
		  AND deadline_warned_at IS NULL
		ORDER BY payment_deadline_at
		LIMIT 200`, orderColumns)

	rows, err := r.pool.Query(ctx, query, StatusYetkazildiTolovKutilmoqda)
	if err != nil {
		return nil, fmt.Errorf("muddati yaqinlashgan buyurtmalarni olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectOrders(rows)
}

func (r *Repository) setDeadlineWarned(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE buyurtmalar SET deadline_warned_at = now(), updated_at = now() WHERE id = $1`, id,
	)
	if err != nil {
		return fmt.Errorf("deadline_warned_at ni belgilab bo'lmadi: %w", err)
	}
	return nil
}

func (r *Repository) countByStatus(ctx context.Context, status string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM buyurtmalar WHERE status = $1`, status).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("buyurtmalar sonini olib bo'lmadi: %w", err)
	}
	return count, nil
}

// ---- platforma qarzlari (platform_debts) ----

func (r *Repository) createDebt(ctx context.Context, q querier, xaridorID, buyurtmaID int64, amount float64) (*PlatformDebt, error) {
	query := fmt.Sprintf(`
		INSERT INTO platform_debts (xaridor_id, buyurtma_id, amount)
		VALUES ($1,$2,$3)
		RETURNING %s`, debtColumns)

	d, err := scanDebt(q.QueryRow(ctx, query, xaridorID, buyurtmaID, amount))
	if err != nil {
		return nil, fmt.Errorf("platforma qarzini bazaga yozib bo'lmadi: %w", err)
	}
	return d, nil
}

func (r *Repository) ListDebts(ctx context.Context, status string, limit, offset int) ([]PlatformDebt, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != "" {
		query := fmt.Sprintf(`SELECT %s FROM platform_debts WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`, debtColumns)
		rows, err = r.pool.Query(ctx, query, status, limit, offset)
	} else {
		query := fmt.Sprintf(`SELECT %s FROM platform_debts ORDER BY id DESC LIMIT $1 OFFSET $2`, debtColumns)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("qarzlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]PlatformDebt, 0)
	for rows.Next() {
		d, err := scanDebt(rows)
		if err != nil {
			return nil, fmt.Errorf("qarz ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *d)
	}
	return items, rows.Err()
}

func (r *Repository) GetDebtByID(ctx context.Context, id int64) (*PlatformDebt, error) {
	query := fmt.Sprintf(`SELECT %s FROM platform_debts WHERE id = $1`, debtColumns)

	d, err := scanDebt(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDebtNotFound
		}
		return nil, fmt.Errorf("qarzni olib bo'lmadi: %w", err)
	}
	return d, nil
}

func (r *Repository) setDebtStatus(ctx context.Context, id int64, status, note string) (*PlatformDebt, error) {
	query := fmt.Sprintf(`
		UPDATE platform_debts SET status = $1, note = COALESCE(NULLIF($2, ''), note), updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, debtColumns)

	d, err := scanDebt(r.pool.QueryRow(ctx, query, status, note, id, DebtStatusOpen))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDebtBadStatus
		}
		return nil, fmt.Errorf("qarz holatini yangilab bo'lmadi: %w", err)
	}
	return d, nil
}

// ---- kurator daromadlari ----

// createKuratorDaromad buyurtma yopilganda kuratorga tegishli daromadni
// yozadi. buyurtma_id UNIQUE bo'lgani uchun bir buyurtma uchun ikki marta
// yozilmaydi (ON CONFLICT DO NOTHING).
func (r *Repository) createKuratorDaromad(ctx context.Context, q querier, kuratorID, buyurtmaID int64, orderAmount, percent, amount float64) error {
	_, err := q.Exec(ctx, `
		INSERT INTO kurator_daromadlar (kurator_id, buyurtma_id, order_amount, percent, amount)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (buyurtma_id) DO NOTHING`,
		kuratorID, buyurtmaID, orderAmount, percent, amount,
	)
	if err != nil {
		return fmt.Errorf("kurator daromadini yozib bo'lmadi: %w", err)
	}
	return nil
}

// ---- shartnomalar (xaridor-zavod umumiy shartnomasi) ----

func (r *Repository) getShartnomaByPair(ctx context.Context, q querier, xaridorID, manufacturerID int64) (*Shartnoma, error) {
	query := fmt.Sprintf(`SELECT %s FROM shartnomalar WHERE xaridor_id = $1 AND ishlabchiqaruvchi_id = $2`, shartnomaColumns)

	s, err := scanShartnoma(q.QueryRow(ctx, query, xaridorID, manufacturerID))
	if err != nil {
		return nil, mapShartnomaError(err, "shartnomani olib bo'lmadi")
	}
	return s, nil
}

func (r *Repository) insertShartnoma(ctx context.Context, q querier, xaridorID, manufacturerID int64, html string) (*Shartnoma, error) {
	query := fmt.Sprintf(`
		INSERT INTO shartnomalar (xaridor_id, ishlabchiqaruvchi_id, contract_html)
		VALUES ($1, $2, $3)
		ON CONFLICT (xaridor_id, ishlabchiqaruvchi_id) DO NOTHING
		RETURNING %s`, shartnomaColumns)

	s, err := scanShartnoma(q.QueryRow(ctx, query, xaridorID, manufacturerID, html))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// ON CONFLICT DO NOTHING tufayli qator qaytmadi — musobaqa holati,
			// mavjud yozuvni o'qib qaytaramiz.
			return r.getShartnomaByPair(ctx, q, xaridorID, manufacturerID)
		}
		return nil, fmt.Errorf("shartnomani bazaga yozib bo'lmadi: %w", err)
	}
	return s, nil
}

// getOrCreateShartnoma xaridor-zavod juftligi uchun shartnoma mavjud
// bo'lmasa, yangi (tasdiqlanmagan) shartnoma yaratadi.
func (r *Repository) getOrCreateShartnoma(ctx context.Context, q querier, xaridorID, manufacturerID int64, contractHTML string) (*Shartnoma, error) {
	existing, err := r.getShartnomaByPair(ctx, q, xaridorID, manufacturerID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, ErrShartnomaNotFound) {
		return nil, err
	}
	return r.insertShartnoma(ctx, q, xaridorID, manufacturerID, contractHTML)
}

func (r *Repository) agreeShartnoma(ctx context.Context, q querier, id int64) (*Shartnoma, error) {
	query := fmt.Sprintf(`
		UPDATE shartnomalar SET agreed_at = now()
		WHERE id = $1 AND agreed_at IS NULL
		RETURNING %s`, shartnomaColumns)

	s, err := scanShartnoma(q.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapShartnomaError(err, "shartnomani tasdiqlab bo'lmadi")
	}
	return s, nil
}
