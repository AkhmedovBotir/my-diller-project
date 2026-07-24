// Package category — kategoriyalar va subkategoriyalar CRUD moduli.
package category

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
	// Category CRUD — alohida
	r.Route("/categories", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))

		// O‘qish: admin, ishlab chiqaruvchi, xaridor (katalog filtrlari)
		r.With(auth.RequireSubject(auth.SubjectAdmin, auth.SubjectIshlabchiqaruvchi, auth.SubjectXaridor)).Get("/", m.handler.List)
		r.With(auth.RequireSubject(auth.SubjectAdmin, auth.SubjectIshlabchiqaruvchi, auth.SubjectXaridor)).Get("/{id}", m.handler.GetByID)

		// Yozish: faqat admin
		r.With(auth.RequireSubject(auth.SubjectAdmin)).Post("/", m.handler.Create)
		r.With(auth.RequireSubject(auth.SubjectAdmin)).Put("/{id}", m.handler.Update)
		r.With(auth.RequireSubject(auth.SubjectAdmin)).Delete("/{id}", m.handler.Delete)
	})

	// Subcategory CRUD — alohida, o'z id si bilan
	r.Route("/subcategories", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))

		r.With(auth.RequireSubject(auth.SubjectAdmin, auth.SubjectIshlabchiqaruvchi, auth.SubjectXaridor)).Get("/", m.handler.ListSubcategories)
		r.With(auth.RequireSubject(auth.SubjectAdmin, auth.SubjectIshlabchiqaruvchi, auth.SubjectXaridor)).Get("/{id}", m.handler.GetSubcategoryByID)

		r.With(auth.RequireSubject(auth.SubjectAdmin)).Post("/", m.handler.CreateSubcategory)
		r.With(auth.RequireSubject(auth.SubjectAdmin)).Put("/{id}", m.handler.UpdateSubcategory)
		r.With(auth.RequireSubject(auth.SubjectAdmin)).Delete("/{id}", m.handler.DeleteSubcategory)
	})
}
