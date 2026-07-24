package admin

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const adminColumns = "id, first_name, last_name, phone, username, password_hash, type, created_at, updated_at"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanAdmin(row pgx.Row) (*Admin, error) {
	var a Admin
	err := row.Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Phone,
		&a.Username, &a.PasswordHash, &a.Type,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
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

func (r *Repository) Create(ctx context.Context, input CreateAdminInput, passwordHash string) (*Admin, error) {
	query := fmt.Sprintf(`
		INSERT INTO admins (first_name, last_name, phone, username, password_hash, type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING %s`, adminColumns)

	a, err := scanAdmin(r.pool.QueryRow(ctx, query,
		input.FirstName, input.LastName, input.Phone,
		input.Username, passwordHash, input.Type,
	))
	if err != nil {
		return nil, mapError(err, "adminni bazaga yozib bo'lmadi")
	}
	return a, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Admin, error) {
	query := fmt.Sprintf(`SELECT %s FROM admins WHERE id = $1`, adminColumns)

	a, err := scanAdmin(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "adminni olib bo'lmadi")
	}
	return a, nil
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (*Admin, error) {
	query := fmt.Sprintf(`SELECT %s FROM admins WHERE username = $1`, adminColumns)

	a, err := scanAdmin(r.pool.QueryRow(ctx, query, username))
	if err != nil {
		return nil, mapError(err, "adminni foydalanuvchi nomi bo'yicha olib bo'lmadi")
	}
	return a, nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]Admin, error) {
	query := fmt.Sprintf(`SELECT %s FROM admins ORDER BY id LIMIT $1 OFFSET $2`, adminColumns)

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("adminlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	admins := make([]Admin, 0)
	for rows.Next() {
		a, err := scanAdmin(rows)
		if err != nil {
			return nil, fmt.Errorf("admin ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		admins = append(admins, *a)
	}

	return admins, rows.Err()
}

// Update ma'lumotlarni yangilaydi; passwordHash bo'sh bo'lsa parol o'zgarmaydi.
func (r *Repository) Update(ctx context.Context, id int64, input UpdateAdminInput, passwordHash string) (*Admin, error) {
	query := fmt.Sprintf(`
		UPDATE admins
		SET first_name = $1, last_name = $2, phone = $3, username = $4, type = $5,
		    password_hash = COALESCE(NULLIF($6, ''), password_hash),
		    updated_at = now()
		WHERE id = $7
		RETURNING %s`, adminColumns)

	a, err := scanAdmin(r.pool.QueryRow(ctx, query,
		input.FirstName, input.LastName, input.Phone,
		input.Username, input.Type, passwordHash, id,
	))
	if err != nil {
		return nil, mapError(err, "adminni yangilab bo'lmadi")
	}
	return a, nil
}

// UpdateProfile profil ma'lumotlarini yangilaydi (type o'zgarmaydi).
func (r *Repository) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput, passwordHash string) (*Admin, error) {
	query := fmt.Sprintf(`
		UPDATE admins
		SET first_name = $1, last_name = $2, phone = $3, username = $4,
		    password_hash = COALESCE(NULLIF($5, ''), password_hash),
		    updated_at = now()
		WHERE id = $6
		RETURNING %s`, adminColumns)

	a, err := scanAdmin(r.pool.QueryRow(ctx, query,
		input.FirstName, input.LastName, input.Phone,
		input.Username, passwordHash, id,
	))
	if err != nil {
		return nil, mapError(err, "profilni yangilab bo'lmadi")
	}
	return a, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM admins WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("adminni o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
