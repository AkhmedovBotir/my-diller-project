package database

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/migrations"
)

func NewPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("ma'lumotlar bazasi manzilini tahlil qilib bo'lmadi: %w", err)
	}

	poolCfg.MaxConns = 10
	poolCfg.MinConns = 2
	poolCfg.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("ulanishlar havzasini yaratib bo'lmadi: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ma'lumotlar bazasi javob bermadi: %w", err)
	}

	return pool, nil
}

// EnsureDatabase postgres tizim bazasiga ulanib, kerakli DB yo'q bo'lsa yaratadi.
func EnsureDatabase(ctx context.Context, adminDSN, dbName string) error {
	pool, err := pgxpool.New(ctx, adminDSN)
	if err != nil {
		return fmt.Errorf("postgres ga ulanib bo'lmadi: %w", err)
	}
	defer pool.Close()

	var exists bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)`, dbName).Scan(&exists); err != nil {
		return fmt.Errorf("baza mavjudligini tekshirib bo'lmadi: %w", err)
	}
	if exists {
		return nil
	}

	// CREATE DATABASE parametrlashtirilmaydi — nomni qattiq tekshiramiz.
	if !isSafeDBName(dbName) {
		return fmt.Errorf("baza nomi noto'g'ri: %s", dbName)
	}
	_, err = pool.Exec(ctx, fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
	if err != nil {
		return fmt.Errorf("baza yaratib bo'lmadi: %w", err)
	}
	return nil
}

func isSafeDBName(name string) bool {
	if name == "" || len(name) > 63 {
		return false
	}
	for i, r := range name {
		ok := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_'
		if !ok || (i == 0 && r >= '0' && r <= '9') {
			return false
		}
	}
	return true
}

// Migrate asosiy (diller) bazasi migratsiyalarini ishga tushiradi.
func Migrate(dsn string) error {
	return MigrateFS(dsn, migrations.FS)
}

// MigrateFS berilgan embed SQL migratsiyalarni ishga tushiradi.
// pgx/v5 migrate drayveri `pgx5://` sxemasini kutadi (postgres:// emas).
func MigrateFS(dsn string, fs embed.FS) error {
	src, err := iofs.New(fs, ".")
	if err != nil {
		return fmt.Errorf("migratsiyalarni yuklab bo'lmadi: %w", err)
	}

	migrateDSN := strings.Replace(dsn, "postgres://", "pgx5://", 1)

	m, err := migrate.NewWithSourceInstance("iofs", src, migrateDSN)
	if err != nil {
		return fmt.Errorf("migratsiya tizimini ishga tushirib bo'lmadi: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migratsiyalarni bajarib bo'lmadi: %w", err)
	}

	return nil
}
