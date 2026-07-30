package kuratorassign

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FindByMFYID MFY ga biriktirilgan kuratorni qaytaradi.
func FindByMFYID(ctx context.Context, pool *pgxpool.Pool, mfyID int64) (*int64, error) {
	if mfyID <= 0 {
		return nil, nil
	}

	var id int64
	err := pool.QueryRow(ctx, `
		SELECT kurator_id FROM kurator_mfy
		WHERE mfy_id = $1
		LIMIT 1`, mfyID,
	).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &id, nil
}
