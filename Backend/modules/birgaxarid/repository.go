package birgaxarid

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func mapError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			if strings.Contains(pgErr.ConstraintName, "phone") {
				return ErrPhoneTaken
			}
			if strings.Contains(pgErr.ConstraintName, "group_buy_items") ||
				strings.Contains(pgErr.ConstraintName, "product_id") {
				return validationError("items", "Combo da bir xil mahsulotni ikki marta tanlab bo'lmaydi")
			}
			return ErrNameTaken
		case "23503":
			return ErrConflict
		}
	}
	return fmt.Errorf("%s: %w", action, err)
}

func nullLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 200 {
		return 200
	}
	return limit
}

// --- Categories ---

func (r *Repository) CreateCategory(ctx context.Context, in CategoryInput) (*Category, error) {
	icon := strings.TrimSpace(in.Icon)
	if icon == "" {
		icon = "Package"
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO categories (name, description, icon)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, icon, created_at, updated_at`,
		strings.TrimSpace(in.Name), strings.TrimSpace(in.Description), icon)
	var c Category
	if err := row.Scan(&c.ID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, mapError(err, "kategoriya yaratilmadi")
	}
	return &c, nil
}

func (r *Repository) ListCategories(ctx context.Context, limit, offset int) ([]Category, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, description, icon, created_at, updated_at
		FROM categories ORDER BY id LIMIT $1 OFFSET $2`, nullLimit(limit), offset)
	if err != nil {
		return nil, fmt.Errorf("kategoriyalar: %w", err)
	}
	defer rows.Close()
	items := make([]Category, 0)
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *Repository) GetCategory(ctx context.Context, id int64) (*Category, error) {
	var c Category
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, description, icon, created_at, updated_at FROM categories WHERE id = $1`, id).
		Scan(&c.ID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, mapError(err, "kategoriya")
	}
	return &c, nil
}

func (r *Repository) UpdateCategory(ctx context.Context, id int64, in CategoryInput) (*Category, error) {
	icon := strings.TrimSpace(in.Icon)
	if icon == "" {
		icon = "Package"
	}
	var c Category
	err := r.pool.QueryRow(ctx, `
		UPDATE categories SET name = $1, description = $2, icon = $3, updated_at = now()
		WHERE id = $4
		RETURNING id, name, description, icon, created_at, updated_at`,
		strings.TrimSpace(in.Name), strings.TrimSpace(in.Description), icon, id).
		Scan(&c.ID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, mapError(err, "kategoriya yangilanmadi")
	}
	return &c, nil
}

func (r *Repository) DeleteCategory(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return mapError(err, "kategoriya o'chirilmadi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Subcategories ---

func (r *Repository) CreateSubcategory(ctx context.Context, in SubcategoryInput) (*Subcategory, error) {
	var s Subcategory
	err := r.pool.QueryRow(ctx, `
		INSERT INTO subcategories (category_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, category_id, name, description, created_at, updated_at`,
		in.CategoryID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Description)).
		Scan(&s.ID, &s.CategoryID, &s.Name, &s.Description, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err, "subkategoriya yaratilmadi")
	}
	return &s, nil
}

func (r *Repository) ListSubcategories(ctx context.Context, categoryID int64, limit, offset int) ([]Subcategory, error) {
	query := `
		SELECT id, category_id, name, description, created_at, updated_at
		FROM subcategories`
	args := []any{}
	if categoryID > 0 {
		query += ` WHERE category_id = $1 ORDER BY id LIMIT $2 OFFSET $3`
		args = append(args, categoryID, nullLimit(limit), offset)
	} else {
		query += ` ORDER BY id LIMIT $1 OFFSET $2`
		args = append(args, nullLimit(limit), offset)
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("subkategoriyalar: %w", err)
	}
	defer rows.Close()
	items := make([]Subcategory, 0)
	for rows.Next() {
		var s Subcategory
		if err := rows.Scan(&s.ID, &s.CategoryID, &s.Name, &s.Description, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateSubcategory(ctx context.Context, id int64, in SubcategoryInput) (*Subcategory, error) {
	var s Subcategory
	err := r.pool.QueryRow(ctx, `
		UPDATE subcategories SET category_id = $1, name = $2, description = $3, updated_at = now()
		WHERE id = $4
		RETURNING id, category_id, name, description, created_at, updated_at`,
		in.CategoryID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Description), id).
		Scan(&s.ID, &s.CategoryID, &s.Name, &s.Description, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err, "subkategoriya yangilanmadi")
	}
	return &s, nil
}

func (r *Repository) DeleteSubcategory(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM subcategories WHERE id = $1`, id)
	if err != nil {
		return mapError(err, "subkategoriya o'chirilmadi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Products ---

func scanProduct(row pgx.Row) (*Product, error) {
	var p Product
	err := row.Scan(
		&p.ID, &p.CategoryID, &p.SubcategoryID, &p.Name, &p.Description,
		&p.Unit, &p.Price, &p.Stock, &p.PhotoURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) CreateProduct(ctx context.Context, in ProductInput) (*Product, error) {
	unit := strings.ToLower(strings.TrimSpace(in.Unit))
	if unit == "" {
		unit = "dona"
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	p, err := scanProduct(r.pool.QueryRow(ctx, `
		INSERT INTO products (category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active, created_at, updated_at`,
		in.CategoryID, in.SubcategoryID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Description),
		unit, in.Price, in.Stock, strings.TrimSpace(in.PhotoURL), active))
	if err != nil {
		return nil, mapError(err, "mahsulot yaratilmadi")
	}
	return p, nil
}

func (r *Repository) ListProducts(ctx context.Context, categoryID int64, limit, offset int) ([]Product, error) {
	query := `
		SELECT id, category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active, created_at, updated_at
		FROM products`
	args := []any{}
	if categoryID > 0 {
		query += ` WHERE category_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`
		args = append(args, categoryID, nullLimit(limit), offset)
	} else {
		query += ` ORDER BY id DESC LIMIT $1 OFFSET $2`
		args = append(args, nullLimit(limit), offset)
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar: %w", err)
	}
	defer rows.Close()
	items := make([]Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *p)
	}
	return items, rows.Err()
}

func (r *Repository) GetProduct(ctx context.Context, id int64) (*Product, error) {
	p, err := scanProduct(r.pool.QueryRow(ctx, `
		SELECT id, category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active, created_at, updated_at
		FROM products WHERE id = $1`, id))
	if err != nil {
		return nil, mapError(err, "mahsulot")
	}
	return p, nil
}

func (r *Repository) UpdateProduct(ctx context.Context, id int64, in ProductInput) (*Product, error) {
	unit := strings.ToLower(strings.TrimSpace(in.Unit))
	if unit == "" {
		unit = "dona"
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	p, err := scanProduct(r.pool.QueryRow(ctx, `
		UPDATE products SET
			category_id = $1, subcategory_id = $2, name = $3, description = $4,
			unit = $5, price = $6, stock = $7, photo_url = $8, is_active = $9, updated_at = now()
		WHERE id = $10
		RETURNING id, category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active, created_at, updated_at`,
		in.CategoryID, in.SubcategoryID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Description),
		unit, in.Price, in.Stock, strings.TrimSpace(in.PhotoURL), active, id))
	if err != nil {
		return nil, mapError(err, "mahsulot yangilanmadi")
	}
	return p, nil
}

func (r *Repository) DeleteProduct(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return mapError(err, "mahsulot o'chirilmadi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Group buys ---

func scanGroupBuy(row pgx.Row) (*GroupBuy, error) {
	var g GroupBuy
	err := row.Scan(
		&g.ID, &g.Kind, &g.Title, &g.Description, &g.ProductID,
		&g.Price, &g.MinVolume, &g.CurrentVolume, &g.Stock, &g.PhotoURLs,
		&g.Status, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if g.PhotoURLs == nil {
		g.PhotoURLs = []string{}
	}
	return &g, nil
}

func (r *Repository) loadGroupBuyItems(ctx context.Context, groupBuyID int64) ([]GroupBuyItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT i.id, i.group_buy_id, i.product_id, i.quantity,
		       COALESCE(p.name, ''), COALESCE(p.photo_url, '')
		FROM group_buy_items i
		LEFT JOIN products p ON p.id = i.product_id
		WHERE i.group_buy_id = $1 ORDER BY i.id`, groupBuyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]GroupBuyItem, 0)
	for rows.Next() {
		var it GroupBuyItem
		if err := rows.Scan(
			&it.ID, &it.GroupBuyID, &it.ProductID, &it.Quantity, &it.ProductName, &it.PhotoURL,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *Repository) CreateGroupBuy(ctx context.Context, in GroupBuyInput) (*GroupBuy, error) {
	kind := strings.TrimSpace(in.Kind)
	if kind == "" {
		kind = "product"
	}
	photos := in.PhotoURLs
	if photos == nil {
		photos = []string{}
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	g, err := scanGroupBuy(tx.QueryRow(ctx, `
		INSERT INTO group_buys (kind, title, description, product_id, price, min_volume, stock, photo_urls)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, kind, title, description, product_id, price, min_volume, current_volume, stock, photo_urls, status, created_at, updated_at`,
		kind, strings.TrimSpace(in.Title), strings.TrimSpace(in.Description), in.ProductID,
		in.Price, in.MinVolume, in.Stock, photos))
	if err != nil {
		return nil, mapError(err, "yig'im yaratilmadi")
	}

	if kind == "combo" {
		for _, item := range in.Items {
			qty := item.Quantity
			if qty < 1 {
				qty = 1
			}
			_, err := tx.Exec(ctx, `
				INSERT INTO group_buy_items (group_buy_id, product_id, quantity)
				VALUES ($1, $2, $3)`, g.ID, item.ProductID, qty)
			if err != nil {
				return nil, mapError(err, "combo tarkibi")
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	items, _ := r.loadGroupBuyItems(ctx, g.ID)
	g.Items = items
	return g, nil
}

func (r *Repository) ListGroupBuys(ctx context.Context, status string, limit, offset int) ([]GroupBuy, error) {
	query := `
		SELECT id, kind, title, description, product_id, price, min_volume, current_volume, stock, photo_urls, status, created_at, updated_at
		FROM group_buys`
	args := []any{}
	if status != "" {
		query += ` WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`
		args = append(args, status, nullLimit(limit), offset)
	} else {
		query += ` ORDER BY id DESC LIMIT $1 OFFSET $2`
		args = append(args, nullLimit(limit), offset)
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("yig'imlar: %w", err)
	}
	defer rows.Close()
	items := make([]GroupBuy, 0)
	for rows.Next() {
		g, err := scanGroupBuy(rows)
		if err != nil {
			return nil, err
		}
		lines, err := r.loadGroupBuyItems(ctx, g.ID)
		if err != nil {
			return nil, err
		}
		g.Items = lines
		items = append(items, *g)
	}
	return items, rows.Err()
}

func (r *Repository) GetGroupBuy(ctx context.Context, id int64) (*GroupBuy, error) {
	g, err := scanGroupBuy(r.pool.QueryRow(ctx, `
		SELECT id, kind, title, description, product_id, price, min_volume, current_volume, stock, photo_urls, status, created_at, updated_at
		FROM group_buys WHERE id = $1`, id))
	if err != nil {
		return nil, mapError(err, "yig'im")
	}
	items, err := r.loadGroupBuyItems(ctx, id)
	if err != nil {
		return nil, err
	}
	g.Items = items
	return g, nil
}

func (r *Repository) UpdateGroupBuy(ctx context.Context, id int64, in GroupBuyInput) (*GroupBuy, error) {
	kind := strings.TrimSpace(in.Kind)
	if kind == "" {
		kind = "product"
	}
	photos := in.PhotoURLs
	if photos == nil {
		photos = []string{}
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := scanGroupBuy(tx.QueryRow(ctx, `
		UPDATE group_buys SET
			kind = $1, title = $2, description = $3, product_id = $4,
			price = $5, min_volume = $6, stock = $7, photo_urls = $8, updated_at = now()
		WHERE id = $9
		RETURNING id, kind, title, description, product_id, price, min_volume, current_volume, stock, photo_urls, status, created_at, updated_at`,
		kind, strings.TrimSpace(in.Title), strings.TrimSpace(in.Description), in.ProductID,
		in.Price, in.MinVolume, in.Stock, photos, id)); err != nil {
		return nil, mapError(err, "yig'im yangilanmadi")
	}

	if _, err := tx.Exec(ctx, `DELETE FROM group_buy_items WHERE group_buy_id = $1`, id); err != nil {
		return nil, err
	}
	if kind == "combo" {
		for _, item := range in.Items {
			qty := item.Quantity
			if qty < 1 {
				qty = 1
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO group_buy_items (group_buy_id, product_id, quantity)
				VALUES ($1, $2, $3)`, id, item.ProductID, qty); err != nil {
				return nil, mapError(err, "combo tarkibi")
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetGroupBuy(ctx, id)
}

func (r *Repository) SetGroupBuyStatus(ctx context.Context, id int64, status string) (*GroupBuy, error) {
	g, err := scanGroupBuy(r.pool.QueryRow(ctx, `
		UPDATE group_buys SET status = $1, updated_at = now()
		WHERE id = $2
		RETURNING id, kind, title, description, product_id, price, min_volume, current_volume, stock, photo_urls, status, created_at, updated_at`,
		status, id))
	if err != nil {
		return nil, mapError(err, "status yangilanmadi")
	}
	items, _ := r.loadGroupBuyItems(ctx, id)
	g.Items = items
	return g, nil
}

func (r *Repository) DeleteGroupBuy(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM group_buys WHERE id = $1`, id)
	if err != nil {
		return mapError(err, "yig'im o'chirilmadi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

