// Package notification — sayt ichidagi bildirishnomalar moduli.
package notification

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service // order kabi boshqa modullar Notifier interfeysi orqali foydalanadi
}

func NewModule(pool *pgxpool.Pool, jwtSecret string) *Module {
	repo := NewRepository(pool)
	service := NewService(repo)
	handler := NewHandler(service)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Route("/notifications", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(
			auth.SubjectAdmin,
			auth.SubjectIshlabchiqaruvchi,
			auth.SubjectXaridor,
			auth.SubjectDostavka,
		))

		r.Get("/", m.handler.List)
		r.Post("/{id}/read", m.handler.MarkRead)
		r.Post("/read-all", m.handler.MarkAllRead)
	})
}
