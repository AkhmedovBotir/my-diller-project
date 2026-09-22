package eskiz

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/config"
)

type Module struct {
	Service *Service
}

func NewModule(pool *pgxpool.Pool, cfg config.EskizConfig, hmacSecret string) *Module {
	repo := NewRepository(pool)
	client := NewClient(cfg)
	return &Module{
		Service: NewService(repo, client, hmacSecret),
	}
}
