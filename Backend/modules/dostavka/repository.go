package dostavka

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const columns = "id, company_name, first_name, last_name, phone, username, password_hash, created_at, updated_at"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanRow(row pgx.Row) (*Dostavka, error) {
	var item Dostavka
	err := row.Scan(
		&item.ID, &item.CompanyName, &item.FirstName, &item.LastName,
		&item.Phone, &item.Username, &item.PasswordHash,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func mapError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrUsernameTaken
	}
	return fmt.Errorf("%s: %w", action, err)
}

func (r *Repository) Create(ctx context.Context, input CreateInput, passwordHash string) (*Dostavka, error) {
	query := fmt.Sprintf(`
		INSERT INTO dostavka_kompaniyalari (company_name, first_name, last_name, phone, username, password_hash)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.CompanyName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash,
	))
	if err != nil {
		return nil, mapError(err, "dostavka kompaniyasini bazaga yozib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Dostavka, error) {
	query := fmt.Sprintf(`SELECT %s FROM dostavka_kompaniyalari WHERE id = $1`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "dostavka kompaniyasini olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (*Dostavka, error) {
	query := fmt.Sprintf(`SELECT %s FROM dostavka_kompaniyalari WHERE username = $1`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, username))
	if err != nil {
		return nil, mapError(err, "dostavka kompaniyasini foydalanuvchi nomi bo'yicha olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]Dostavka, error) {
	query := fmt.Sprintf(`SELECT %s FROM dostavka_kompaniyalari ORDER BY id LIMIT $1 OFFSET $2`, columns)

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("dostavka kompaniyalari ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Dostavka, 0)
	for rows.Next() {
		item, err := scanRow(rows)
		if err != nil {
			return nil, fmt.Errorf("dostavka kompaniyasi ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *item)
	}

	return items, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateInput, passwordHash string) (*Dostavka, error) {
	query := fmt.Sprintf(`
		UPDATE dostavka_kompaniyalari
		SET company_name = $1, first_name = $2, last_name = $3, phone = $4, username = $5,
		    password_hash = COALESCE(NULLIF($6, ''), password_hash),
		    updated_at = now()
		WHERE id = $7
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.CompanyName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash, id,
	))
	if err != nil {
		return nil, mapError(err, "dostavka kompaniyasini yangilab bo'lmadi")
	}
	return item, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput, passwordHash string) (*Dostavka, error) {
	query := fmt.Sprintf(`
		UPDATE dostavka_kompaniyalari
		SET company_name = $1, first_name = $2, last_name = $3, phone = $4, username = $5,
		    password_hash = COALESCE(NULLIF($6, ''), password_hash),
		    updated_at = now()
		WHERE id = $7
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.CompanyName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash, id,
	))
	if err != nil {
		return nil, mapError(err, "profilni yangilab bo'lmadi")
	}
	return item, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM dostavka_kompaniyalari WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("dostavka kompaniyasini o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
