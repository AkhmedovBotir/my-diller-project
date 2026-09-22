package xaridor

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const columns = `id, shop_name, first_name, last_name, phone, username, password_hash,
	stir, bank_account, bank_name, mfo, city, mfy, birth_date, address, lat, lng, kurator_id,
	mfy_id, is_blocked, blocked_reason, created_at, updated_at`

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanRow(row pgx.Row) (*Xaridor, error) {
	var item Xaridor
	err := row.Scan(
		&item.ID, &item.ShopName, &item.FirstName, &item.LastName,
		&item.Phone, &item.Username, &item.PasswordHash,
		&item.Stir, &item.BankAccount, &item.BankName, &item.MFO,
		&item.City, &item.MFY, &item.BirthDate, &item.Address,
		&item.Lat, &item.Lng, &item.KuratorID, &item.MFYID,
		&item.IsBlocked, &item.BlockedReason,
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

func (r *Repository) Create(ctx context.Context, input CreateInput, passwordHash string) (*Xaridor, error) {
	query := fmt.Sprintf(`
		INSERT INTO xaridorlar (shop_name, first_name, last_name, phone, username, password_hash,
			stir, bank_account, bank_name, mfo, address, lat, lng)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.ShopName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash,
		input.Stir, input.BankAccount, input.BankName, input.MFO, input.Address,
		input.Lat, input.Lng,
	))
	if err != nil {
		return nil, mapError(err, "xaridorni bazaga yozib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Xaridor, error) {
	query := fmt.Sprintf(`SELECT %s FROM xaridorlar WHERE id = $1`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "xaridorni olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (*Xaridor, error) {
	query := fmt.Sprintf(`SELECT %s FROM xaridorlar WHERE username = $1`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, username))
	if err != nil {
		return nil, mapError(err, "xaridorni foydalanuvchi nomi bo'yicha olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetByPhone(ctx context.Context, phone string) (*Xaridor, error) {
	query := fmt.Sprintf(`SELECT %s FROM xaridorlar WHERE phone = $1`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, phone))
	if err != nil {
		return nil, mapError(err, "xaridorni telefon bo'yicha olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE xaridorlar SET password_hash = $1, updated_at = now() WHERE id = $2`, passwordHash, id)
	if err != nil {
		return fmt.Errorf("parolni yangilab bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]Xaridor, error) {
	query := fmt.Sprintf(`SELECT %s FROM xaridorlar ORDER BY id LIMIT $1 OFFSET $2`, columns)

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("xaridorlar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Xaridor, 0)
	for rows.Next() {
		item, err := scanRow(rows)
		if err != nil {
			return nil, fmt.Errorf("xaridor ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *item)
	}

	return items, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateInput, passwordHash string) (*Xaridor, error) {
	query := fmt.Sprintf(`
		UPDATE xaridorlar
		SET shop_name = $1, first_name = $2, last_name = $3, phone = $4, username = $5,
		    password_hash = COALESCE(NULLIF($6, ''), password_hash),
		    stir = $7, bank_account = $8, bank_name = $9, mfo = $10, address = $11, lat = $12, lng = $13,
		    updated_at = now()
		WHERE id = $14
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.ShopName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash,
		input.Stir, input.BankAccount, input.BankName, input.MFO, input.Address, input.Lat, input.Lng,
		id,
	))
	if err != nil {
		return nil, mapError(err, "xaridorni yangilab bo'lmadi")
	}
	return item, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput, passwordHash string, birthDate *time.Time, kuratorID *int64) (*Xaridor, error) {
	query := fmt.Sprintf(`
		UPDATE xaridorlar
		SET shop_name = $1, first_name = $2, last_name = $3, phone = $4, username = $5,
		    password_hash = COALESCE(NULLIF($6, ''), password_hash),
		    city = $7, mfy = $8, birth_date = $9,
		    stir = $10, bank_account = $11, bank_name = $12, mfo = $13, address = $14, lat = $15, lng = $16,
		    kurator_id = $17, mfy_id = $18,
		    updated_at = now()
		WHERE id = $19
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query,
		input.ShopName, input.FirstName, input.LastName,
		input.Phone, input.Username, passwordHash,
		input.City, input.MFY, birthDate,
		input.Stir, input.BankAccount, input.BankName, input.MFO, input.Address, input.Lat, input.Lng,
		kuratorID, input.MFYID, id,
	))
	if err != nil {
		return nil, mapError(err, "profilni yangilab bo'lmadi")
	}
	return item, nil
}

func (r *Repository) GetKuratorSummary(ctx context.Context, kuratorID int64) (*KuratorSummary, error) {
	var k KuratorSummary
	err := r.pool.QueryRow(ctx, `
		SELECT id, first_name, last_name, phone, username
		FROM admins WHERE id = $1 AND type = 'kurator'`, kuratorID,
	).Scan(&k.ID, &k.FirstName, &k.LastName, &k.Phone, &k.Username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("kurator ma'lumotlarini olib bo'lmadi: %w", err)
	}
	return &k, nil
}

func (r *Repository) Block(ctx context.Context, id int64, reason string) (*Xaridor, error) {
	query := fmt.Sprintf(`
		UPDATE xaridorlar
		SET is_blocked = TRUE, blocked_reason = $1, updated_at = now()
		WHERE id = $2
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, reason, id))
	if err != nil {
		return nil, mapError(err, "xaridorni bloklab bo'lmadi")
	}
	return item, nil
}

func (r *Repository) Unblock(ctx context.Context, id int64) (*Xaridor, error) {
	query := fmt.Sprintf(`
		UPDATE xaridorlar
		SET is_blocked = FALSE, blocked_reason = '', updated_at = now()
		WHERE id = $1
		RETURNING %s`, columns)

	item, err := scanRow(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "xaridor blokini olib bo'lmadi")
	}
	return item, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM xaridorlar WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("xaridorni o'chirib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
