// Package kurator — kurator daromadlari va kartaga pul yechish so'rovlari
// bo'yicha modul (order.Notifier interfeysi orqali bildirishnoma yuborishi
// mumkin, import tsiklidan qochish uchun).
package kurator

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
)

// roleKurator/roleGeneral modules/admin.Type* qiymatlari bilan mos keladi.
// Import tsiklidan qochish uchun bu yerda literal sifatida takrorlanadi.
const (
	roleKurator = "kurator"
	roleGeneral = "general"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
}

func NewModule(pool *pgxpool.Pool, jwtSecret string, notifier Notifier) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, notifier)
	handler := NewHandler(service)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	// Kurator — o'z daromadi, to'lov so'rovlari va nazorat qilayotgan
	// zavodlarning komissiyalari
	r.Route("/kurator/daromad", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole(roleKurator))

		r.Get("/", m.handler.GetDaromad)
	})

	r.Route("/kurator/tolov-sorovlari", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole(roleKurator))

		r.Get("/", m.handler.ListTolovSorovlari)
		r.Post("/", m.handler.CreateTolovSorov)
	})

	r.Route("/kurator/komissiyalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole(roleKurator))

		r.Get("/", m.handler.ListKomissiyalar)
	})

	// Bosh admin — kurator to'lov so'rovlarini boshqarish
	r.Route("/admin/kurator-tolov-sorovlari", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole(roleGeneral))

		r.Get("/", m.handler.AdminListTolovSorovlari)
		r.Post("/{id}/pay", m.handler.AdminPayTolovSorov)
		r.Post("/{id}/reject", m.handler.AdminRejectTolovSorov)
	})
}
