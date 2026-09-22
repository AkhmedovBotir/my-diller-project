package eskiz

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanOTP(row pgx.Row) (*OTP, error) {
	var item OTP
	err := row.Scan(
		&item.ID, &item.ChallengeID, &item.Phone, &item.Purpose, &item.SubjectType,
		&item.CodeHash, &item.Payload, &item.Attempts, &item.MaxAttempts,
		&item.ExpiresAt, &item.ConsumedAt, &item.LastSentAt, &item.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) Create(ctx context.Context, item *OTP) (*OTP, error) {
	query := `
		INSERT INTO sms_otps (
			challenge_id, phone, purpose, subject_type, code_hash, payload,
			attempts, max_attempts, expires_at, last_sent_at
		) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
		RETURNING id, challenge_id, phone, purpose, subject_type, code_hash, payload,
			attempts, max_attempts, expires_at, consumed_at, last_sent_at, created_at`

	otp, err := scanOTP(r.pool.QueryRow(ctx, query,
		item.ChallengeID, item.Phone, item.Purpose, item.SubjectType,
		item.CodeHash, item.Payload, item.MaxAttempts, item.ExpiresAt, item.LastSentAt,
	))
	if err != nil {
		return nil, fmt.Errorf("SMS kodini saqlab bo'lmadi: %w", err)
	}
	return otp, nil
}

func (r *Repository) GetByChallenge(ctx context.Context, challengeID string) (*OTP, error) {
	query := `
		SELECT id, challenge_id, phone, purpose, subject_type, code_hash, payload,
			attempts, max_attempts, expires_at, consumed_at, last_sent_at, created_at
		FROM sms_otps WHERE challenge_id = $1`

	otp, err := scanOTP(r.pool.QueryRow(ctx, query, challengeID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrChallengeNotFound
		}
		return nil, fmt.Errorf("SMS kodini olib bo'lmadi: %w", err)
	}
	return otp, nil
}

func (r *Repository) FindActive(ctx context.Context, phone, purpose, subjectType string) (*OTP, error) {
	query := `
		SELECT id, challenge_id, phone, purpose, subject_type, code_hash, payload,
			attempts, max_attempts, expires_at, consumed_at, last_sent_at, created_at
		FROM sms_otps
		WHERE phone = $1 AND purpose = $2 AND subject_type = $3
			AND consumed_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1`

	otp, err := scanOTP(r.pool.QueryRow(ctx, query, phone, purpose, subjectType))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrChallengeNotFound
		}
		return nil, fmt.Errorf("faol SMS kodini olib bo'lmadi: %w", err)
	}
	return otp, nil
}

func (r *Repository) InvalidateActive(ctx context.Context, phone, purpose, subjectType string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sms_otps
		SET consumed_at = NOW()
		WHERE phone = $1 AND purpose = $2 AND subject_type = $3 AND consumed_at IS NULL`,
		phone, purpose, subjectType,
	)
	if err != nil {
		return fmt.Errorf("eski SMS kodlarini yopib bo'lmadi: %w", err)
	}
	return nil
}

func (r *Repository) Refresh(ctx context.Context, id int64, codeHash string, payload []byte, expiresAt, lastSentAt time.Time) (*OTP, error) {
	query := `
		UPDATE sms_otps
		SET code_hash = $1, payload = $2, attempts = 0, expires_at = $3, last_sent_at = $4
		WHERE id = $5
		RETURNING id, challenge_id, phone, purpose, subject_type, code_hash, payload,
			attempts, max_attempts, expires_at, consumed_at, last_sent_at, created_at`

	otp, err := scanOTP(r.pool.QueryRow(ctx, query, codeHash, payload, expiresAt, lastSentAt, id))
	if err != nil {
		return nil, fmt.Errorf("SMS kodini yangilab bo'lmadi: %w", err)
	}
	return otp, nil
}

func (r *Repository) IncrementAttempts(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE sms_otps SET attempts = attempts + 1 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("SMS urinishini yozib bo'lmadi: %w", err)
	}
	return nil
}

func (r *Repository) Consume(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE sms_otps SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL`, id)
	if err != nil {
		return fmt.Errorf("SMS kodini yopib bo'lmadi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrConsumed
	}
	return nil
}
