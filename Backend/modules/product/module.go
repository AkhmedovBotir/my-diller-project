// Package product — mahsulotlar moduli (ishlabchiqaruvchi + admin).
package product

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/upload"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	storage   *upload.Storage
	Service   *Service
}

func NewModule(pool *pgxpool.Pool, jwtSecret string, storage *upload.Storage) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, storage)
	handler := NewHandler(service, storage)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		storage:   storage,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	// Ommaviy katalog — xaridorlar uchun, autentifikatsiyasiz
	r.Route("/catalog/products", func(r chi.Router) {
		r.Get("/", m.handler.CatalogList)
		r.Get("/{id}", m.handler.CatalogGet)
	})
	r.Get("/catalog/manufacturers", m.handler.CatalogManufacturers)

	// Ishlab chiqaruvchi mahsulotlari
	r.Route("/ishlabchiqaruvchi/products", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectIshlabchiqaruvchi))

		r.Get("/", m.handler.ManufacturerList)
		r.Post("/", m.handler.ManufacturerCreate)
		r.Get("/{id}", m.handler.ManufacturerGet)
		r.Put("/{id}", m.handler.ManufacturerUpdate)
		r.Post("/{id}/resubmit", m.handler.ManufacturerResubmit)
		r.Delete("/{id}", m.handler.ManufacturerDelete)
	})

	// Admin mahsulot boshqaruvi
	r.Route("/admin/products", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.AdminList)
		r.Get("/{id}", m.handler.AdminGet)
		r.Put("/{id}", m.handler.AdminUpdate)
		r.Post("/{id}/approve", m.handler.AdminApprove)
		r.Post("/{id}/reject", m.handler.AdminReject)
		r.Delete("/{id}", m.handler.AdminDelete)
	})
}

// MountUploads yuklangan rasmlarni static sifatida beradi.
func MountUploads(r chi.Router, storage *upload.Storage) {
	fileServer := http.StripPrefix("/uploads/", http.FileServer(http.Dir(storage.Dir())))
	r.Handle("/uploads/*", fileServer)
}
