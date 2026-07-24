package category

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const subcategoryColumns = "id, category_id, name, description, created_at, updated_at"

func scanSubcategory(row pgx.Row) (*Subcategory, error) {
	var s Subcategory
	if err := row.Scan(&s.ID, &s.CategoryID, &s.Name, &s.Description, &s.CreatedAt, &s.UpdatedAt); err != nil {
		return nil, err
	}
	return &s, nil
}

func mapSubcategoryError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSubNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return ErrSubNameTaken
		case "23503":
			return ErrNotFound
		}
	}
	return fmt.Errorf("%s: %w", action, err)
}

func (r *Repository) CreateSubcategory(ctx context.Context, input CreateSubcategoryInput) (*Subcategory, error) {
	query := fmt.Sprintf(`
		INSERT INTO subcategories (category_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING %s`, subcategoryColumns)

	s, err := scanSubcategory(r.pool.QueryRow(
		ctx, query, input.CategoryID, strings.TrimSpace(input.Name), input.Description,
	))
	if err != nil {
		return nil, mapSubcategoryError(err, "subkategoriyani bazaga yozib bo'lmadi")
	}
	return s, nil
}

func (r *Repository) GetSubcategoryByID(ctx context.Context, id int64) (*Subcategory, error) {
	query := fmt.Sprintf(`SELECT %s FROM subcategories WHERE id = $1`, subcategoryColumns)
	s, err := scanSubcategory(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapSubcategoryError(err, "subkategoriyani olib bo'lmadi")
	}
	return s, nil
}

func (r *Repository) ListSubcategories(ctx context.Context, categoryID int64, limit, offset int) ([]Subcategory, error) {
	var (
		rows pgx.Rows
		err  error
	)

	if categoryID > 0 {
		query := fmt.Sprintf(`
			SELECT %s FROM subcategories
			WHERE category_id = $1
			ORDER BY id LIMIT $2 OFFSET $3`, subcategoryColumns)
		rows, err = r.pool.Query(ctx, query, categoryID, limit, offset)
	} else {
		query := fmt.Sprintf(`
			SELECT %s FROM subcategories
			ORDER BY id LIMIT $1 OFFSET $2`, subcategoryColumns)
		rows, err = r.pool.Query(ctx, query, limit, offset)
	}
	if err != nil {
		return nil, fmt.Errorf("subkategoriyalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Subcategory, 0)
	for rows.Next() {
		s, err := scanSubcategory(rows)
		if err != nil {
			return nil, fmt.Errorf("subkategoriya ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *s)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateSubcategory(ctx context.Context, id int64, input UpdateSubcategoryInput) (*Subcategory, error) {
	query := fmt.Sprintf(`
		UPDATE subcategories
		SET category_id = $1, name = $2, description = $3, updated_at = now()
		WHERE id = $4
		RETURNING %s`, subcategoryColumns)

	s, err := scanSubcategory(r.pool.QueryRow(
		ctx, query, input.CategoryID, strings.TrimSpace(input.Name), input.Description, id,
	))
	if err != nil {
		return nil, mapSubcategoryError(err, "subkategoriyani yangilab bo'lmadi")
	}
	return s, nil
}

func (r *Repository) DeleteSubcategory(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM subcategories WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("subkategoriyani o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSubNotFound
	}
	return nil
}
