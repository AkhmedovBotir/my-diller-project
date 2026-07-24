// Package dostavka — dostavka kompaniyalari moduli: CRUD, login va profil.
package dostavka

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
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
	r.Route("/dostavka", func(r chi.Router) {
		r.Post("/auth/login", m.handler.Login)

		// Dostavka kompaniyasi o'z profili
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(m.jwtSecret))
			r.Use(auth.RequireSubject(auth.SubjectDostavka))

			r.Get("/profile", m.handler.GetProfile)
			r.Put("/profile", m.handler.UpdateProfile)
		})
	})

	// Admin boshqaruvidagi CRUD
	r.Route("/dostavka-kompaniyalari", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.List)
		r.Get("/{id}", m.handler.GetByID)
		r.Post("/", m.handler.Create)
		r.Put("/{id}", m.handler.Update)
		r.Delete("/{id}", m.handler.Delete)
	})
}
