package region

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
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
	r.Route("/regions", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.With(auth.RequireSubject(
			auth.SubjectAdmin,
			auth.SubjectIshlabchiqaruvchi,
			auth.SubjectXaridor,
			auth.SubjectDostavka,
		)).Get("/", m.handler.List)
		r.With(auth.RequireSubject(
			auth.SubjectAdmin,
			auth.SubjectIshlabchiqaruvchi,
			auth.SubjectXaridor,
			auth.SubjectDostavka,
		)).Get("/{id}", m.handler.GetByID)
	})

	r.Route("/admin/regions", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole("general"))

		r.Get("/", m.handler.List)
		r.Post("/", m.handler.Create)
		r.Post("/import", m.handler.Import)
		r.Get("/{id}", m.handler.GetByID)
		r.Put("/{id}", m.handler.Update)
		r.Delete("/{id}", m.handler.Delete)
	})

	r.Route("/admin/kuratorlar/{id}/mfys", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole("general"))

		r.Get("/", m.handler.ListKuratorMFYs)
		r.Put("/", m.handler.SetKuratorMFYs)
	})

	r.Route("/kurator/mfys", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole("kurator"))

		r.Get("/", m.handler.MyKuratorMFYs)
	})
}
