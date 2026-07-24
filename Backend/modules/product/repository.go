package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const columns = `
	id, code, ishlabchiqaruvchi_id, name, description, category_id, subcategory_id,
	price, quantity, moq, payment_term, payment_days, specs, images, status,
	rejection_note, reviewed_by, reviewed_at, created_at, updated_at`

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanProduct(row pgx.Row) (*Product, error) {
	var p Product
	var desc []byte
	var specs []byte
	err := row.Scan(
		&p.ID, &p.Code, &p.IshlabchiqaruvchiID, &p.Name, &desc,
		&p.CategoryID, &p.SubcategoryID, &p.Price, &p.Quantity,
		&p.MOQ, &p.PaymentTerm, &p.PaymentDays, &specs, &p.Images,
		&p.Status, &p.RejectionNote, &p.ReviewedBy, &p.ReviewedAt,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.Description = json.RawMessage(desc)
	p.Specs = json.RawMessage(specs)
	if p.Images == nil {
		p.Images = []string{}
	}
	return &p, nil
}

func mapError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return ErrCodeTaken
		case "23503":
			return ErrCategory
		}
	}
	return fmt.Errorf("%s: %w", action, err)
}

func (r *Repository) CodeExists(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM products WHERE code = $1)`, code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("mahsulot kodini tekshirib bo'lmadi: %w", err)
	}
	return exists, nil
}

func (r *Repository) SubcategoryBelongsToCategory(ctx context.Context, categoryID, subcategoryID int64) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM subcategories
			WHERE id = $1 AND category_id = $2
		)`, subcategoryID, categoryID,
	).Scan(&ok)
	if err != nil {
		return false, fmt.Errorf("subkategoriyani tekshirib bo'lmadi: %w", err)
	}
	return ok, nil
}

func (r *Repository) Create(ctx context.Context, code string, ownerID int64, input CreateInput, status string) (*Product, error) {
	query := fmt.Sprintf(`
		INSERT INTO products (
			code, ishlabchiqaruvchi_id, name, description, category_id, subcategory_id,
			price, quantity, moq, payment_term, payment_days, specs, images, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING %s`, columns)

	p, err := scanProduct(r.pool.QueryRow(
		ctx, query,
		code, ownerID, input.Name, []byte(input.Description),
		input.CategoryID, input.SubcategoryID, input.Price, input.Quantity,
		input.MOQ, input.PaymentTerm, input.PaymentDays, specsOrDefault(input.Specs),
		input.Images, status,
	))
	if err != nil {
		return nil, mapError(err, "mahsulotni bazaga yozib bo'lmadi")
	}
	return p, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Product, error) {
	query := fmt.Sprintf(`SELECT %s FROM products WHERE id = $1`, columns)
	p, err := scanProduct(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "mahsulotni olib bo'lmadi")
	}
	return p, nil
}

func (r *Repository) ListByOwner(ctx context.Context, ownerID int64, status string, limit, offset int) ([]Product, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != "" {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE ishlabchiqaruvchi_id = $1 AND status = $2
			ORDER BY id DESC LIMIT $3 OFFSET $4`, columns)
		rows, err = r.pool.Query(ctx, query, ownerID, status, limit, offset)
	} else {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE ishlabchiqaruvchi_id = $1
			ORDER BY id DESC LIMIT $2 OFFSET $3`, columns)
		rows, err = r.pool.Query(ctx, query, ownerID, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectProducts(rows)
}

func (r *Repository) ListAll(ctx context.Context, status string, limit, offset int) ([]Product, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != "" {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE status = $1
			ORDER BY id DESC LIMIT $2 OFFSET $3`, columns)
		rows, err = r.pool.Query(ctx, query, status, limit, offset)
	} else {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			ORDER BY id DESC LIMIT $1 OFFSET $2`, columns)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectProducts(rows)
}

func (r *Repository) GetApproved(ctx context.Context, id int64) (*Product, error) {
	query := fmt.Sprintf(`SELECT %s FROM products WHERE id = $1 AND status = $2`, columns)
	p, err := scanProduct(r.pool.QueryRow(ctx, query, id, StatusApproved))
	if err != nil {
		return nil, mapError(err, "mahsulotni olib bo'lmadi")
	}
	return p, nil
}

func (r *Repository) ListApproved(ctx context.Context, categoryID, subcategoryID int64, search string, limit, offset int) ([]Product, error) {
	conditions := []string{"status = $1"}
	args := []any{StatusApproved}
	idx := 2

	if categoryID > 0 {
		conditions = append(conditions, fmt.Sprintf("category_id = $%d", idx))
		args = append(args, categoryID)
		idx++
	}
	if subcategoryID > 0 {
		conditions = append(conditions, fmt.Sprintf("subcategory_id = $%d", idx))
		args = append(args, subcategoryID)
		idx++
	}
	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	query := fmt.Sprintf(`
		SELECT %s FROM products
		WHERE %s
		ORDER BY id DESC LIMIT $%d OFFSET $%d`, columns, strings.Join(conditions, " AND "), idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectProducts(rows)
}

func collectProducts(rows pgx.Rows) ([]Product, error) {
	items := make([]Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("mahsulot ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *p)
	}
	return items, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateInput, images []string, status, rejectionNote string, clearReview bool) (*Product, error) {
	query := fmt.Sprintf(`
		UPDATE products SET
			name = $1,
			description = $2,
			category_id = $3,
			subcategory_id = $4,
			price = $5,
			quantity = $6,
			moq = $7,
			payment_term = $8,
			payment_days = $9,
			specs = $10,
			images = $11,
			status = $12,
			rejection_note = $13,
			reviewed_by = CASE WHEN $14 THEN NULL ELSE reviewed_by END,
			reviewed_at = CASE WHEN $14 THEN NULL ELSE reviewed_at END,
			updated_at = now()
		WHERE id = $15
		RETURNING %s`, columns)

	p, err := scanProduct(r.pool.QueryRow(
		ctx, query,
		input.Name, []byte(input.Description), input.CategoryID, input.SubcategoryID,
		input.Price, input.Quantity, input.MOQ, input.PaymentTerm, input.PaymentDays,
		specsOrDefault(input.Specs), images, status, rejectionNote, clearReview, id,
	))
	if err != nil {
		return nil, mapError(err, "mahsulotni yangilab bo'lmadi")
	}
	return p, nil
}

func (r *Repository) SetStatus(ctx context.Context, id int64, status, note string, adminID *int64) (*Product, error) {
	query := fmt.Sprintf(`
		UPDATE products SET
			status = $1,
			rejection_note = $2,
			reviewed_by = $3,
			reviewed_at = now(),
			updated_at = now()
		WHERE id = $4
		RETURNING %s`, columns)

	p, err := scanProduct(r.pool.QueryRow(ctx, query, status, note, adminID, id))
	if err != nil {
		return nil, mapError(err, "mahsulot holatini yangilab bo'lmadi")
	}
	return p, nil
}

func (r *Repository) Resubmit(ctx context.Context, id int64) (*Product, error) {
	query := fmt.Sprintf(`
		UPDATE products SET
			status = $1,
			rejection_note = '',
			reviewed_by = NULL,
			reviewed_at = NULL,
			updated_at = now()
		WHERE id = $2 AND status = $3
		RETURNING %s`, columns)

	p, err := scanProduct(r.pool.QueryRow(ctx, query, StatusPending, id, StatusRejected))
	if err != nil {
		return nil, mapError(err, "mahsulotni qayta yuborib bo'lmadi")
	}
	return p, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("mahsulotni o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
