package notification

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const columns = "id, recipient_type, recipient_id, title, body, link, is_read, created_at"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanNotification(row pgx.Row) (*Notification, error) {
	var n Notification
	err := row.Scan(
		&n.ID, &n.RecipientType, &n.RecipientID,
		&n.Title, &n.Body, &n.Link, &n.IsRead, &n.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func mapError(err error, action string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return fmt.Errorf("%s: %w", action, err)
}

func (r *Repository) Create(ctx context.Context, recipientType string, recipientID int64, title, body, link string) (*Notification, error) {
	query := fmt.Sprintf(`
		INSERT INTO notifications (recipient_type, recipient_id, title, body, link)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING %s`, columns)

	n, err := scanNotification(r.pool.QueryRow(ctx, query, recipientType, recipientID, title, body, link))
	if err != nil {
		return nil, mapError(err, "bildirishnomani bazaga yozib bo'lmadi")
	}
	return n, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Notification, error) {
	query := fmt.Sprintf(`SELECT %s FROM notifications WHERE id = $1`, columns)

	n, err := scanNotification(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "bildirishnomani olib bo'lmadi")
	}
	return n, nil
}

func (r *Repository) ListByRecipient(ctx context.Context, recipientType string, recipientID int64, limit, offset int) ([]Notification, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM notifications
		WHERE recipient_type = $1 AND recipient_id = $2
		ORDER BY id DESC LIMIT $3 OFFSET $4`, columns)

	rows, err := r.pool.Query(ctx, query, recipientType, recipientID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("bildirishnomalar ro'yxatini olib bo'lmadi: %w", err)
	}
	defer rows.Close()

	items := make([]Notification, 0)
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, fmt.Errorf("bildirishnoma ma'lumotlarini o'qib bo'lmadi: %w", err)
		}
		items = append(items, *n)
	}

	return items, rows.Err()
}

func (r *Repository) MarkRead(ctx context.Context, id int64) (*Notification, error) {
	query := fmt.Sprintf(`
		UPDATE notifications SET is_read = TRUE
		WHERE id = $1
		RETURNING %s`, columns)

	n, err := scanNotification(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapError(err, "bildirishnomani o'qilgan deb belgilab bo'lmadi")
	}
	return n, nil
}

func (r *Repository) MarkAllRead(ctx context.Context, recipientType string, recipientID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notifications SET is_read = TRUE
		WHERE recipient_type = $1 AND recipient_id = $2 AND is_read = FALSE`,
		recipientType, recipientID,
	)
	if err != nil {
		return fmt.Errorf("bildirishnomalarni o'qilgan deb belgilab bo'lmadi: %w", err)
	}
	return nil
}
