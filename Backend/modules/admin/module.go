// Package admin — adminlar moduli: CRUD, login va profil boshqaruvi.
package admin

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service // boshqa modullar foydalanishi uchun public
}

func NewModule(pool *pgxpool.Pool, jwtSecret string, jwtTTL time.Duration) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, jwtSecret, jwtTTL)
	handler := NewHandler(service)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Route("/admin", func(r chi.Router) {
		// Ochiq endpoint
		r.Post("/auth/login", m.handler.Login)

		// Token talab qilinadigan endpointlar (faqat admin token)
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(m.jwtSecret))
			r.Use(auth.RequireSubject(auth.SubjectAdmin))

			r.Get("/profile", m.handler.GetProfile)
			r.Put("/profile", m.handler.UpdateProfile)

			r.Route("/admins", func(r chi.Router) {
				r.Get("/", m.handler.List)
				r.Get("/{id}", m.handler.GetByID)

				// Faqat general admin boshqara oladi
				r.Group(func(r chi.Router) {
					r.Use(auth.RequireRole(TypeGeneral))

					r.Post("/", m.handler.Create)
					r.Put("/{id}", m.handler.Update)
					r.Delete("/{id}", m.handler.Delete)
				})
			})
		})
	})
}
