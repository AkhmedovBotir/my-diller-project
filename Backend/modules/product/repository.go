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
	id, code, ishlabchiqaruvchi_id, name, city, description, category_id, subcategory_id,
	price, quantity, moq, payment_term, payment_days, specs, images, status,
	rejection_note, reviewed_by, reviewed_at, deleted_at, created_at, updated_at`

const activeFilter = `deleted_at IS NULL`

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
		&p.ID, &p.Code, &p.IshlabchiqaruvchiID, &p.Name, &p.City, &desc,
		&p.CategoryID, &p.SubcategoryID, &p.Price, &p.Quantity,
		&p.MOQ, &p.PaymentTerm, &p.PaymentDays, &specs, &p.Images,
		&p.Status, &p.RejectionNote, &p.ReviewedBy, &p.ReviewedAt,
		&p.DeletedAt, &p.CreatedAt, &p.UpdatedAt,
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

func (r *Repository) CodeExists(ctx context.Context, code string, excludeID int64) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM products
			WHERE lower(code) = lower($1) AND deleted_at IS NULL AND id <> $2
		)`, strings.TrimSpace(code), excludeID,
	).Scan(&exists)
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
			code, ishlabchiqaruvchi_id, name, city, description, category_id, subcategory_id,
			price, quantity, moq, payment_term, payment_days, specs, images, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING %s`, columns)

	p, err := scanProduct(r.pool.QueryRow(
		ctx, query,
		code, ownerID, input.Name, input.City, []byte(input.Description),
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
	query := fmt.Sprintf(`SELECT %s FROM products WHERE id = $1 AND %s`, columns, activeFilter)
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
			WHERE ishlabchiqaruvchi_id = $1 AND status = $2 AND %s
			ORDER BY id DESC LIMIT $3 OFFSET $4`, columns, activeFilter)
		rows, err = r.pool.Query(ctx, query, ownerID, status, limit, offset)
	} else {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE ishlabchiqaruvchi_id = $1 AND %s
			ORDER BY id DESC LIMIT $2 OFFSET $3`, columns, activeFilter)
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
			WHERE status = $1 AND %s
			ORDER BY id DESC LIMIT $2 OFFSET $3`, columns, activeFilter)
		rows, err = r.pool.Query(ctx, query, status, limit, offset)
	} else {
		query := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE %s
			ORDER BY id DESC LIMIT $1 OFFSET $2`, columns, activeFilter)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectProducts(rows)
}

func (r *Repository) GetApproved(ctx context.Context, id int64) (*Product, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM products WHERE id = $1 AND status = $2 AND %s`,
		columns, activeFilter,
	)
	p, err := scanProduct(r.pool.QueryRow(ctx, query, id, StatusApproved))
	if err != nil {
		return nil, mapError(err, "mahsulotni olib bo'lmadi")
	}
	return p, nil
}

func (r *Repository) ListApproved(ctx context.Context, categoryID, subcategoryID, ishlabchiqaruvchiID int64, search string, limit, offset int) ([]CatalogProduct, error) {
	conditions := []string{"p.status = $1", "p.deleted_at IS NULL"}
	args := []any{StatusApproved}
	idx := 2

	if categoryID > 0 {
		conditions = append(conditions, fmt.Sprintf("p.category_id = $%d", idx))
		args = append(args, categoryID)
		idx++
	}
	if subcategoryID > 0 {
		conditions = append(conditions, fmt.Sprintf("p.subcategory_id = $%d", idx))
		args = append(args, subcategoryID)
		idx++
	}
	if ishlabchiqaruvchiID > 0 {
		conditions = append(conditions, fmt.Sprintf("p.ishlabchiqaruvchi_id = $%d", idx))
		args = append(args, ishlabchiqaruvchiID)
		idx++
	}
	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(p.name ILIKE $%d OR p.code ILIKE $%d OR i.company_name ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	query := fmt.Sprintf(`
		SELECT %s, i.company_name
		FROM products p
		INNER JOIN ishlabchiqaruvchilar i ON i.id = p.ishlabchiqaruvchi_id
		WHERE %s
		ORDER BY p.id DESC LIMIT $%d OFFSET $%d`, columnsWithAlias("p"), strings.Join(conditions, " AND "), idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()
	return collectCatalogProducts(rows)
}

func columnsWithAlias(alias string) string {
	return fmt.Sprintf(`
		%s.id, %s.code, %s.ishlabchiqaruvchi_id, %s.name, %s.city, %s.description, %s.category_id, %s.subcategory_id,
		%s.price, %s.quantity, %s.moq, %s.payment_term, %s.payment_days, %s.specs, %s.images, %s.status,
		%s.rejection_note, %s.reviewed_by, %s.reviewed_at, %s.deleted_at, %s.created_at, %s.updated_at`,
		alias, alias, alias, alias, alias, alias, alias, alias,
		alias, alias, alias, alias, alias, alias, alias, alias,
		alias, alias, alias, alias, alias, alias)
}

func scanCatalogProduct(row pgx.Row) (*CatalogProduct, error) {
	var item CatalogProduct
	var desc []byte
	var specs []byte
	err := row.Scan(
		&item.ID, &item.Code, &item.IshlabchiqaruvchiID, &item.Name, &item.City, &desc,
		&item.CategoryID, &item.SubcategoryID, &item.Price, &item.Quantity,
		&item.MOQ, &item.PaymentTerm, &item.PaymentDays, &specs, &item.Images,
		&item.Status, &item.RejectionNote, &item.ReviewedBy, &item.ReviewedAt,
		&item.DeletedAt, &item.CreatedAt, &item.UpdatedAt, &item.CompanyName,
	)
	if err != nil {
		return nil, err
	}
	item.Description = json.RawMessage(desc)
	item.Specs = json.RawMessage(specs)
	if item.Images == nil {
		item.Images = []string{}
	}
	return &item, nil
}

func collectCatalogProducts(rows pgx.Rows) ([]CatalogProduct, error) {
	items := make([]CatalogProduct, 0)
	for rows.Next() {
		p, err := scanCatalogProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("mahsulot ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *p)
	}
	return items, rows.Err()
}

func (r *Repository) GetApprovedCatalog(ctx context.Context, id int64) (*CatalogProduct, error) {
	query := fmt.Sprintf(`
		SELECT %s, i.company_name
		FROM products p
		INNER JOIN ishlabchiqaruvchilar i ON i.id = p.ishlabchiqaruvchi_id
		WHERE p.id = $1 AND p.status = $2 AND p.deleted_at IS NULL`, columnsWithAlias("p"))

	item, err := scanCatalogProduct(r.pool.QueryRow(ctx, query, id, StatusApproved))
	if err != nil {
		return nil, mapError(err, "mahsulotni olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) ListCatalogManufacturers(ctx context.Context) ([]CatalogManufacturer, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT i.id, i.company_name
		FROM ishlabchiqaruvchilar i
		INNER JOIN products p ON p.ishlabchiqaruvchi_id = i.id
		WHERE p.status = 'approved' AND p.deleted_at IS NULL
		ORDER BY i.company_name ASC`)
	if err != nil {
		return nil, fmt.Errorf("korxonalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]CatalogManufacturer, 0)
	for rows.Next() {
		var item CatalogManufacturer
		if err := rows.Scan(&item.ID, &item.CompanyName); err != nil {
			return nil, fmt.Errorf("korxona ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
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
			code = $1,
			name = $2,
			city = $3,
			description = $4,
			category_id = $5,
			subcategory_id = $6,
			price = $7,
			quantity = $8,
			moq = $9,
			payment_term = $10,
			payment_days = $11,
			specs = $12,
			images = $13,
			status = $14,
			rejection_note = $15,
			reviewed_by = CASE WHEN $16 THEN NULL ELSE reviewed_by END,
			reviewed_at = CASE WHEN $16 THEN NULL ELSE reviewed_at END,
			updated_at = now()
		WHERE id = $17 AND %s
		RETURNING %s`, activeFilter, columns)

	p, err := scanProduct(r.pool.QueryRow(
		ctx, query,
		strings.TrimSpace(input.Code), input.Name, input.City, []byte(input.Description), input.CategoryID, input.SubcategoryID,
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
		WHERE id = $4 AND %s
		RETURNING %s`, activeFilter, columns)

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
		WHERE id = $2 AND status = $3 AND %s
		RETURNING %s`, activeFilter, columns)

	p, err := scanProduct(r.pool.QueryRow(ctx, query, StatusPending, id, StatusRejected))
	if err != nil {
		return nil, mapError(err, "mahsulotni qayta yuborib bo'lmadi")
	}
	return p, nil
}

// SoftDelete mahsulotni ro'yxatdan yashiradi; buyurtma tarixi uchun qator saqlanadi.
func (r *Repository) SoftDelete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE products
		SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return fmt.Errorf("mahsulotni o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
