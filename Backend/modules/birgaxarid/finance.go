package birgaxarid

import (
	"context"
	"fmt"
	"math"
	"strings"
)

func scanSettings(row interface {
	Scan(dest ...any) error
}) (*Settings, error) {
	var s Settings
	err := row.Scan(
		&s.ID, &s.MinOrderAmount,
		&s.CourierFeeMode, &s.CourierFeePercent, &s.CourierFeeFixed,
		&s.KuratorFeeMode, &s.KuratorFeePercent, &s.KuratorFeeFixed,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if s.CourierFeeMode == "" {
		s.CourierFeeMode = "percent"
	}
	if s.KuratorFeeMode == "" {
		s.KuratorFeeMode = "percent"
	}
	return &s, nil
}

func (r *Repository) GetSettings(ctx context.Context) (*Settings, error) {
	s, err := scanSettings(r.pool.QueryRow(ctx, `
		SELECT id, min_order_amount,
		       COALESCE(courier_fee_mode, 'percent'), COALESCE(courier_fee_percent, 0), COALESCE(courier_fee_fixed, 0),
		       COALESCE(kurator_fee_mode, 'percent'), COALESCE(kurator_fee_percent, 0), COALESCE(kurator_fee_fixed, 0),
		       updated_at
		FROM settings
		ORDER BY id
		LIMIT 1`))
	if err != nil {
		return nil, mapError(err, "sozlamalar")
	}
	return s, nil
}

func (r *Repository) UpdateSettings(ctx context.Context, in SettingsInput) (*Settings, error) {
	courierMode := strings.TrimSpace(in.CourierFeeMode)
	if courierMode == "" {
		courierMode = "percent"
	}
	kuratorMode := strings.TrimSpace(in.KuratorFeeMode)
	if kuratorMode == "" {
		kuratorMode = "percent"
	}
	s, err := scanSettings(r.pool.QueryRow(ctx, `
		UPDATE settings
		SET min_order_amount = $1,
		    courier_fee_mode = $2,
		    courier_fee_percent = $3,
		    courier_fee_fixed = $4,
		    kurator_fee_mode = $5,
		    kurator_fee_percent = $6,
		    kurator_fee_fixed = $7,
		    updated_at = now()
		WHERE id = (SELECT id FROM settings ORDER BY id LIMIT 1)
		RETURNING id, min_order_amount,
		          courier_fee_mode, courier_fee_percent, courier_fee_fixed,
		          kurator_fee_mode, kurator_fee_percent, kurator_fee_fixed,
		          updated_at`,
		in.MinOrderAmount, courierMode, in.CourierFeePercent, in.CourierFeeFixed,
		kuratorMode, in.KuratorFeePercent, in.KuratorFeeFixed,
	))
	if err != nil {
		return nil, mapError(err, "sozlamalar yangilanmadi")
	}
	return s, nil
}

func (r *Repository) EnsureSettings(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO settings (min_order_amount)
		SELECT 0
		WHERE NOT EXISTS (SELECT 1 FROM settings)`)
	if err != nil {
		return fmt.Errorf("settings seed: %w", err)
	}
	return nil
}

func calcFee(mode string, percent float64, fixed, orderAmount int64) int64 {
	if strings.TrimSpace(mode) == "fixed" {
		if fixed < 0 {
			return 0
		}
		return fixed
	}
	if percent <= 0 || orderAmount <= 0 {
		return 0
	}
	return int64(math.Round(float64(orderAmount) * percent / 100.0))
}

func (r *Repository) CreateFinanceAccrualFromOrder(ctx context.Context, view *OrderView, settings *Settings) error {
	if view == nil || settings == nil {
		return nil
	}
	courierAmount := calcFee(settings.CourierFeeMode, settings.CourierFeePercent, settings.CourierFeeFixed, view.TotalAmount)
	kuratorAmount := calcFee(settings.KuratorFeeMode, settings.KuratorFeePercent, settings.KuratorFeeFixed, view.TotalAmount)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO finance_accruals (
			order_id, order_amount, courier_id, courier_amount,
			kurator_amount, region_name, city_name, mfy_name
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (order_id) DO NOTHING`,
		view.ID, view.TotalAmount, view.CourierID, courierAmount,
		kuratorAmount, view.RegionName, view.CityName, view.MfyName,
	)
	if err != nil {
		return fmt.Errorf("moliya accrual: %w", err)
	}
	return nil
}

func scanFinanceAccrual(row interface {
	Scan(dest ...any) error
}) (*FinanceAccrual, error) {
	var a FinanceAccrual
	err := row.Scan(
		&a.ID, &a.OrderID, &a.OrderAmount, &a.CourierID, &a.CourierAmount,
		&a.CourierPaid, &a.CourierPaidAt, &a.KuratorAmount, &a.KuratorPaid, &a.KuratorPaidAt,
		&a.RegionName, &a.CityName, &a.MfyName, &a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) ListFinanceAccruals(ctx context.Context, role string, paid *bool, limit, offset int) ([]FinanceAccrual, error) {
	query := `
		SELECT id, order_id, order_amount, courier_id, courier_amount,
		       courier_paid, courier_paid_at, kurator_amount, kurator_paid, kurator_paid_at,
		       region_name, city_name, mfy_name, created_at
		FROM finance_accruals`
	args := []any{}
	where := []string{}
	if role == "courier" {
		where = append(where, "courier_amount > 0")
		if paid != nil {
			where = append(where, fmt.Sprintf("courier_paid = $%d", len(args)+1))
			args = append(args, *paid)
		}
	}
	if role == "kurator" {
		where = append(where, "kurator_amount > 0")
		if paid != nil {
			where = append(where, fmt.Sprintf("kurator_paid = $%d", len(args)+1))
			args = append(args, *paid)
		}
	}
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, nullLimit(limit), offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("moliya ro'yxati: %w", err)
	}
	defer rows.Close()
	items := make([]FinanceAccrual, 0)
	for rows.Next() {
		a, err := scanFinanceAccrual(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *a)
	}
	return items, rows.Err()
}

func (r *Repository) GetFinanceStats(ctx context.Context) (*FinanceStats, error) {
	var st FinanceStats
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'issued'),
			COALESCE(SUM(total_amount) FILTER (WHERE status = 'issued'), 0)
		FROM orders`).Scan(&st.IssuedOrders, &st.GrossVolume)
	if err != nil {
		return nil, fmt.Errorf("moliya statistikasi (orders): %w", err)
	}
	err = r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(courier_amount), 0),
			COALESCE(SUM(courier_amount) FILTER (WHERE courier_paid), 0),
			COALESCE(SUM(courier_amount) FILTER (WHERE NOT courier_paid), 0),
			COALESCE(SUM(kurator_amount), 0),
			COALESCE(SUM(kurator_amount) FILTER (WHERE kurator_paid), 0),
			COALESCE(SUM(kurator_amount) FILTER (WHERE NOT kurator_paid), 0)
		FROM finance_accruals`).Scan(
		&st.CourierAccrued, &st.CourierPaid, &st.CourierPending,
		&st.KuratorAccrued, &st.KuratorPaid, &st.KuratorPending,
	)
	if err != nil {
		return nil, fmt.Errorf("moliya statistikasi (accruals): %w", err)
	}
	st.PlatformEstimate = st.GrossVolume - st.CourierAccrued - st.KuratorAccrued
	if st.PlatformEstimate < 0 {
		st.PlatformEstimate = 0
	}
	return &st, nil
}

func (r *Repository) MarkCourierPaid(ctx context.Context, ids []int64) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE finance_accruals
		SET courier_paid = true, courier_paid_at = now()
		WHERE id = ANY($1) AND courier_paid = false AND courier_amount > 0`,
		ids)
	if err != nil {
		return 0, mapError(err, "kuryer to'lovi")
	}
	return tag.RowsAffected(), nil
}

func (r *Repository) MarkKuratorPaid(ctx context.Context, ids []int64) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE finance_accruals
		SET kurator_paid = true, kurator_paid_at = now()
		WHERE id = ANY($1) AND kurator_paid = false AND kurator_amount > 0`,
		ids)
	if err != nil {
		return 0, mapError(err, "kurator to'lovi")
	}
	return tag.RowsAffected(), nil
}
