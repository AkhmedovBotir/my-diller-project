package kurator

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const daromadColumns = `id, kurator_id, buyurtma_id, order_amount, percent, amount, created_at`

const sorovColumns = `
	id, kurator_id, amount, card_number, card_holder, note, status,
	admin_note, processed_by, processed_at, created_at, updated_at`

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanDaromad(row pgx.Row) (*Daromad, error) {
	var d Daromad
	err := row.Scan(&d.ID, &d.KuratorID, &d.BuyurtmaID, &d.OrderAmount, &d.Percent, &d.Amount, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func scanSorov(row pgx.Row) (*TolovSorovi, error) {
	var s TolovSorovi
	err := row.Scan(
		&s.ID, &s.KuratorID, &s.Amount, &s.CardNumber, &s.CardHolder, &s.Note, &s.Status,
		&s.AdminNote, &s.ProcessedBy, &s.ProcessedAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) sumDaromadlar(ctx context.Context, kuratorID int64) (float64, error) {
	var total float64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM kurator_daromadlar WHERE kurator_id = $1`, kuratorID,
	).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("kurator daromadlari yig'indisini olib bo'lmadi: %w", err)
	}
	return total, nil
}

func (r *Repository) sumSorovlar(ctx context.Context, kuratorID int64, statuses []string) (float64, error) {
	var total float64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM kurator_tolov_sorovlari
		WHERE kurator_id = $1 AND status = ANY($2)`, kuratorID, statuses,
	).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("kurator to'lov so'rovlari yig'indisini olib bo'lmadi: %w", err)
	}
	return total, nil
}

func (r *Repository) ListDaromadlar(ctx context.Context, kuratorID int64, limit, offset int) ([]Daromad, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM kurator_daromadlar
		WHERE kurator_id = $1
		ORDER BY id DESC LIMIT $2 OFFSET $3`, daromadColumns)

	rows, err := r.pool.Query(ctx, query, kuratorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("kurator daromadlari ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Daromad, 0)
	for rows.Next() {
		d, err := scanDaromad(rows)
		if err != nil {
			return nil, fmt.Errorf("daromad ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *d)
	}
	return items, rows.Err()
}

func (r *Repository) CreateTolovSorov(ctx context.Context, kuratorID int64, input CreateTolovSorovInput) (*TolovSorovi, error) {
	query := fmt.Sprintf(`
		INSERT INTO kurator_tolov_sorovlari (kurator_id, amount, card_number, card_holder, note)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING %s`, sorovColumns)

	s, err := scanSorov(r.pool.QueryRow(ctx, query, kuratorID, input.Amount, input.CardNumber, input.CardHolder, input.Note))
	if err != nil {
		return nil, fmt.Errorf("to'lov so'rovini bazaga yozib bo'lmadi: %w", err)
	}
	return s, nil
}

func collectSorovlar(rows pgx.Rows) ([]TolovSorovi, error) {
	items := make([]TolovSorovi, 0)
	for rows.Next() {
		s, err := scanSorov(rows)
		if err != nil {
			return nil, fmt.Errorf("to'lov so'rovi ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *s)
	}
	return items, rows.Err()
}

func (r *Repository) ListSorovlarByKurator(ctx context.Context, kuratorID int64, limit, offset int) ([]TolovSorovi, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM kurator_tolov_sorovlari
		WHERE kurator_id = $1
		ORDER BY id DESC LIMIT $2 OFFSET $3`, sorovColumns)

	rows, err := r.pool.Query(ctx, query, kuratorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("to'lov so'rovlari ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectSorovlar(rows)
}

func (r *Repository) ListSorovlarAll(ctx context.Context, status string, limit, offset int) ([]TolovSorovi, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != "" {
		query := fmt.Sprintf(`SELECT %s FROM kurator_tolov_sorovlari WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`, sorovColumns)
		rows, err = r.pool.Query(ctx, query, status, limit, offset)
	} else {
		query := fmt.Sprintf(`SELECT %s FROM kurator_tolov_sorovlari ORDER BY id DESC LIMIT $1 OFFSET $2`, sorovColumns)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("to'lov so'rovlari ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectSorovlar(rows)
}

func (r *Repository) GetSorovByID(ctx context.Context, id int64) (*TolovSorovi, error) {
	query := fmt.Sprintf(`SELECT %s FROM kurator_tolov_sorovlari WHERE id = $1`, sorovColumns)

	s, err := scanSorov(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("to'lov so'rovini olib bo'lmadi: %w", err)
	}
	return s, nil
}

func (r *Repository) PaySorov(ctx context.Context, id, adminID int64) (*TolovSorovi, error) {
	query := fmt.Sprintf(`
		UPDATE kurator_tolov_sorovlari
		SET status = $1, processed_by = $2, processed_at = now(), updated_at = now()
		WHERE id = $3 AND status = $4
		RETURNING %s`, sorovColumns)

	s, err := scanSorov(r.pool.QueryRow(ctx, query, TolovStatusPaid, adminID, id, TolovStatusPending))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBadStatus
		}
		return nil, fmt.Errorf("to'lov so'rovini to'langan deb belgilab bo'lmadi: %w", err)
	}
	return s, nil
}

func (r *Repository) RejectSorov(ctx context.Context, id, adminID int64, adminNote string) (*TolovSorovi, error) {
	query := fmt.Sprintf(`
		UPDATE kurator_tolov_sorovlari
		SET status = $1, admin_note = $2, processed_by = $3, processed_at = now(), updated_at = now()
		WHERE id = $4 AND status = $5
		RETURNING %s`, sorovColumns)

	s, err := scanSorov(r.pool.QueryRow(ctx, query, TolovStatusRejected, adminNote, adminID, id, TolovStatusPending))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBadStatus
		}
		return nil, fmt.Errorf("to'lov so'rovini rad etib bo'lmadi: %w", err)
	}
	return s, nil
}

// ListKomissiyalarForKurator kurator o'ziga tegishli zavodlarning barcha
// komissiyalarini (holati bo'yicha) ko'rishi uchun.
func (r *Repository) ListKomissiyalarForKurator(ctx context.Context, kuratorID int64, limit, offset int) ([]KomissiyaItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT k.id, k.buyurtma_id, k.ishlabchiqaruvchi_id, i.company_name,
			k.order_amount, k.percent, k.amount, k.status, k.paid_at, k.created_at
		FROM komissiyalar k
		JOIN ishlabchiqaruvchilar i ON i.id = k.ishlabchiqaruvchi_id
		WHERE i.kurator_id = $1
		ORDER BY k.id DESC LIMIT $2 OFFSET $3`,
		kuratorID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("kurator komissiyalari ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]KomissiyaItem, 0)
	for rows.Next() {
		var it KomissiyaItem
		if err := rows.Scan(
			&it.ID, &it.BuyurtmaID, &it.IshlabchiqaruvchiID, &it.CompanyName,
			&it.OrderAmount, &it.Percent, &it.Amount, &it.Status, &it.PaidAt, &it.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("komissiya ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}
