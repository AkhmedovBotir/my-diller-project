package region

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const columns = `id, COALESCE(mongo_oid, ''), parent_id, name, code, type, status, created_at, updated_at`

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func scanRegion(row pgx.Row) (*Region, error) {
	var r Region
	var parentID *int64
	err := row.Scan(
		&r.ID, &r.MongoOID, &parentID, &r.Name, &r.Code, &r.Type, &r.Status, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	r.ParentID = parentID
	return &r, nil
}

func (r *Repository) Create(ctx context.Context, input CreateInput) (*Region, error) {
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}
	code := strings.TrimSpace(input.Code)
	if code == "" {
		code = strings.TrimSpace(input.Name)
	}

	query := fmt.Sprintf(`
		INSERT INTO regions (parent_id, name, code, type, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING %s`, columns)

	return scanRegion(r.pool.QueryRow(ctx, query,
		input.ParentID, strings.TrimSpace(input.Name), code, input.Type, status,
	))
}

func (r *Repository) Update(ctx context.Context, id int64, input UpdateInput) (*Region, error) {
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}
	code := strings.TrimSpace(input.Code)
	if code == "" {
		code = strings.TrimSpace(input.Name)
	}

	query := fmt.Sprintf(`
		UPDATE regions SET
			parent_id = $1,
			name = $2,
			code = $3,
			status = $4,
			updated_at = now()
		WHERE id = $5
		RETURNING %s`, columns)

	return scanRegion(r.pool.QueryRow(ctx, query,
		input.ParentID, strings.TrimSpace(input.Name), code, status, id,
	))
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	var children int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM regions WHERE parent_id = $1`, id).Scan(&children); err != nil {
		return err
	}
	if children > 0 {
		return ErrHasChildren
	}
	tag, err := r.pool.Exec(ctx, `DELETE FROM regions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Region, error) {
	query := fmt.Sprintf(`SELECT %s FROM regions WHERE id = $1`, columns)
	return scanRegion(r.pool.QueryRow(ctx, query, id))
}

func (r *Repository) List(ctx context.Context, typ string, parentID *int64, status string, limit, offset int) ([]Region, error) {
	if limit <= 0 || limit > 5000 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}

	args := []any{}
	where := []string{"1=1"}
	n := 1

	if typ != "" {
		where = append(where, fmt.Sprintf("type = $%d", n))
		args = append(args, typ)
		n++
	}
	if parentID != nil {
		where = append(where, fmt.Sprintf("parent_id = $%d", n))
		args = append(args, *parentID)
		n++
	}
	if status != "" {
		where = append(where, fmt.Sprintf("status = $%d", n))
		args = append(args, status)
		n++
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT %s FROM regions
		WHERE %s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d`, columns, strings.Join(where, " AND "), n, n+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Region, 0)
	for rows.Next() {
		var item Region
		var parent *int64
		if err := rows.Scan(
			&item.ID, &item.MongoOID, &parent, &item.Name, &item.Code, &item.Type, &item.Status, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ParentID = parent
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ResolveLabels(ctx context.Context, mfyID int64) (*Labels, error) {
	var labels Labels
	err := r.pool.QueryRow(ctx, `
		SELECT
			mfy.id, mfy.name,
			district.id, district.name,
			region.id, region.name
		FROM regions mfy
		JOIN regions district ON district.id = mfy.parent_id AND district.type = 'district'
		JOIN regions region ON region.id = district.parent_id AND region.type = 'region'
		WHERE mfy.id = $1 AND mfy.type = 'mfy'
	`, mfyID).Scan(
		&labels.MFYID, &labels.MFYName,
		&labels.DistrictID, &labels.DistrictName,
		&labels.RegionID, &labels.RegionName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	labels.City = labels.DistrictName
	labels.MFY = labels.MFYName
	return &labels, nil
}

func (r *Repository) UpsertByMongoOID(ctx context.Context, mongoOID, name, code, typ, status string) (int64, bool, error) {
	if status == "" {
		status = "active"
	}
	if code == "" {
		code = name
	}
	var id int64
	var inserted bool
	err := r.pool.QueryRow(ctx, `
		INSERT INTO regions (mongo_oid, name, code, type, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (mongo_oid) DO UPDATE SET
			name = EXCLUDED.name,
			code = EXCLUDED.code,
			type = EXCLUDED.type,
			status = EXCLUDED.status,
			updated_at = now()
		RETURNING id, (xmax = 0) AS inserted
	`, mongoOID, name, code, typ, status).Scan(&id, &inserted)
	return id, inserted, err
}

func (r *Repository) SetParentByMongoOID(ctx context.Context, childOID, parentOID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE regions child SET
			parent_id = parent.id,
			updated_at = now()
		FROM regions parent
		WHERE child.mongo_oid = $1
		  AND parent.mongo_oid = $2
	`, childOID, parentOID)
	return err
}

func (r *Repository) ListKuratorMFYs(ctx context.Context, kuratorID int64) ([]Region, error) {
	query := `
		SELECT
			r.id,
			COALESCE(r.mongo_oid, ''),
			r.parent_id,
			r.name,
			r.code,
			r.type,
			r.status,
			r.created_at,
			r.updated_at
		FROM regions r
		INNER JOIN kurator_mfy km ON km.mfy_id = r.id
		WHERE km.kurator_id = $1
		ORDER BY r.name ASC`
	rows, err := r.pool.Query(ctx, query, kuratorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Region, 0)
	for rows.Next() {
		var item Region
		var parent *int64
		if err := rows.Scan(
			&item.ID, &item.MongoOID, &parent, &item.Name, &item.Code, &item.Type, &item.Status, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ParentID = parent
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) SetKuratorMFYs(ctx context.Context, kuratorID int64, mfyIDs []int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM kurator_mfy WHERE kurator_id = $1`, kuratorID); err != nil {
		return err
	}

	for _, mfyID := range mfyIDs {
		var typ string
		err := tx.QueryRow(ctx, `SELECT type FROM regions WHERE id = $1`, mfyID).Scan(&typ)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return validationError("mfy_ids", fmt.Sprintf("MFY topilmadi: %d", mfyID))
			}
			return err
		}
		if typ != TypeMFY {
			return validationError("mfy_ids", "Faqat MFY biriktirish mumkin")
		}

		var existingKurator int64
		err = tx.QueryRow(ctx, `SELECT kurator_id FROM kurator_mfy WHERE mfy_id = $1`, mfyID).Scan(&existingKurator)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err == nil && existingKurator != kuratorID {
			return validationError("mfy_ids", fmt.Sprintf("MFY #%d boshqa kuratorga biriktirilgan", mfyID))
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO kurator_mfy (kurator_id, mfy_id) VALUES ($1, $2)
			ON CONFLICT (mfy_id) DO UPDATE SET kurator_id = EXCLUDED.kurator_id
		`, kuratorID, mfyID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) FindKuratorByMFYID(ctx context.Context, mfyID int64) (*int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		SELECT kurator_id FROM kurator_mfy WHERE mfy_id = $1 LIMIT 1
	`, mfyID).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &id, nil
}

func (r *Repository) GetKuratorSummary(ctx context.Context, kuratorID int64) (*KuratorSummary, error) {
	var k KuratorSummary
	err := r.pool.QueryRow(ctx, `
		SELECT id, first_name, last_name, phone, username
		FROM admins WHERE id = $1 AND type = 'kurator'
	`, kuratorID).Scan(&k.ID, &k.FirstName, &k.LastName, &k.Phone, &k.Username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &k, nil
}

func (r *Repository) EnsureKurator(ctx context.Context, kuratorID int64) error {
	var typ string
	err := r.pool.QueryRow(ctx, `SELECT type FROM admins WHERE id = $1`, kuratorID).Scan(&typ)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if typ != "kurator" {
		return validationError("kurator_id", "Faqat kuratorga MFY biriktirish mumkin")
	}
	return nil
}
