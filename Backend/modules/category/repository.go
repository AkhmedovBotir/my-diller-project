package category

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const categoryColumns = "id, name, description, created_at, updated_at"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanCategory(row pgx.Row) (*Category, error) {
	var c Category
	if err := row.Scan(&c.ID, &c.Name, &c.Description, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	return &c, nil
}

func mapCategoryError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrNameTaken
	}
	return fmt.Errorf("%s: %w", action, err)
}

func (r *Repository) Create(ctx context.Context, input CreateCategoryInput) (*Category, error) {
	query := fmt.Sprintf(`
		INSERT INTO categories (name, description)
		VALUES ($1, $2)
		RETURNING %s`, categoryColumns)

	c, err := scanCategory(r.pool.QueryRow(ctx, query, strings.TrimSpace(input.Name), input.Description))
	if err != nil {
		return nil, mapCategoryError(err, "kategoriyani bazaga yozib bo'lmadi")
	}
	return c, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Category, error) {
	query := fmt.Sprintf(`SELECT %s FROM categories WHERE id = $1`, categoryColumns)
	c, err := scanCategory(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapCategoryError(err, "kategoriyani olib bo'lmadi")
	}
	return c, nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]Category, error) {
	query := fmt.Sprintf(`SELECT %s FROM categories ORDER BY id LIMIT $1 OFFSET $2`, categoryColumns)
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("kategoriyalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Category, 0)
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, fmt.Errorf("kategoriya ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *c)
	}
	return items, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateCategoryInput) (*Category, error) {
	query := fmt.Sprintf(`
		UPDATE categories
		SET name = $1, description = $2, updated_at = now()
		WHERE id = $3
		RETURNING %s`, categoryColumns)

	c, err := scanCategory(r.pool.QueryRow(ctx, query, strings.TrimSpace(input.Name), input.Description, id))
	if err != nil {
		return nil, mapCategoryError(err, "kategoriyani yangilab bo'lmadi")
	}
	return c, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("kategoriyani o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) Exists(ctx context.Context, id int64) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)`, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("kategoriyani tekshirib bo'lmadi: %w", err)
	}
	return exists, nil
}
