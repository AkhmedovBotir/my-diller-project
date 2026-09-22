// Package ishlabchiqaruvchi — ishlab chiqaruvchilar moduli: CRUD, login va profil.
package ishlabchiqaruvchi

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
	"diller-backend/modules/eskiz"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
}

func NewModule(pool *pgxpool.Pool, jwtSecret string, jwtTTL time.Duration, sms *eskiz.Service) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, pool, jwtSecret, jwtTTL, sms)
	handler := NewHandler(service)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Route("/ishlabchiqaruvchi", func(r chi.Router) {
		r.Post("/auth/login", m.handler.Login)
		r.Post("/auth/login/verify", m.handler.VerifyLogin)
		r.Post("/auth/register", m.handler.Register)
		r.Post("/auth/register/verify", m.handler.VerifyRegister)
		r.Post("/auth/sms/resend", m.handler.ResendSMS)
		r.Post("/auth/forgot", m.handler.ForgotPassword)
		r.Post("/auth/reset", m.handler.ResetPassword)

		// Ishlab chiqaruvchi o'z profili
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(m.jwtSecret))
			r.Use(auth.RequireSubject(auth.SubjectIshlabchiqaruvchi))

			r.Get("/profile", m.handler.GetProfile)
			r.Put("/profile", m.handler.UpdateProfile)
		})
	})

	// Admin boshqaruvidagi CRUD
	r.Route("/ishlabchiqaruvchilar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.List)
		r.Get("/{id}", m.handler.GetByID)
		r.Post("/", m.handler.Create)
		r.Put("/{id}", m.handler.Update)
		r.Delete("/{id}", m.handler.Delete)
	})
}
