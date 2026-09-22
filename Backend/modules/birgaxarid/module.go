package birgaxarid

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/upload"
	"diller-backend/modules/eskiz"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
}

func NewModule(
	pool *pgxpool.Pool,
	jwtSecret string,
	jwtTTL time.Duration,
	storage *upload.Storage,
	sms *eskiz.Service,
	courier CourierAreaProvider,
) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, sms, courier)
	handler := NewHandler(service, storage, jwtSecret, jwtTTL)
	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	// Public catalog + SMS auth (User panel)
	r.Route("/public/birga-xarid", func(r chi.Router) {
		r.Post("/auth/login", m.handler.AuthLogin)
		r.Post("/auth/verify", m.handler.AuthVerify)
		r.Post("/auth/sms/resend", m.handler.AuthResendSMS)

		r.Get("/categories", m.handler.ListCategories)
		r.Get("/categories/{id}", m.handler.GetCategory)
		r.Get("/subcategories", m.handler.ListSubcategories)
		r.Get("/products", m.handler.CatalogListProducts)
		r.Get("/products/{id}", m.handler.GetProduct)
		r.Get("/group-buys", m.handler.CatalogListGroupBuys)
		r.Get("/group-buys/{id}", m.handler.GetGroupBuy)
		r.Get("/settings", m.handler.PublicGetSettings)
	})

	// Customer (Birga xaridor)
	r.Route("/birga-xarid/me", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectBirgaCustomer))
		r.Get("/", m.handler.AuthMe)
		r.Patch("/", m.handler.AuthUpdateMe)
		r.Put("/", m.handler.AuthUpdateMe)
		r.Get("/orders", m.handler.ListMyOrders)
		r.Get("/orders/{id}", m.handler.GetMyOrder)
		r.Post("/orders/{id}/cancel", m.handler.CancelMyOrder)
	})

	r.Route("/birga-xarid/cart", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectBirgaCustomer))
		r.Get("/", m.handler.GetCart)
		r.Put("/", m.handler.UpsertCartItem)
		r.Delete("/{groupBuyId}", m.handler.DeleteCartItem)
		r.Post("/checkout", m.handler.Checkout)
	})

	// Dostavka — Birga Xarid yetkazish
	r.Route("/dostavka/birga-xarid", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectDostavka))
		r.Get("/orders", m.handler.CourierListOrders)
		r.Get("/orders/{id}", m.handler.CourierGetOrder)
		r.Post("/orders/{id}/claim", m.handler.CourierClaimOrder)
		r.Post("/orders/{id}/deliver", m.handler.CourierDeliverOrder)
	})

	// Admin / kurator
	r.Route("/birga-xarid", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Route("/categories", func(r chi.Router) {
			r.Get("/", m.handler.ListCategories)
			r.Get("/{id}", m.handler.GetCategory)
			r.Post("/", m.handler.CreateCategory)
			r.Put("/{id}", m.handler.UpdateCategory)
			r.Delete("/{id}", m.handler.DeleteCategory)
		})

		r.Route("/subcategories", func(r chi.Router) {
			r.Get("/", m.handler.ListSubcategories)
			r.Post("/", m.handler.CreateSubcategory)
			r.Put("/{id}", m.handler.UpdateSubcategory)
			r.Delete("/{id}", m.handler.DeleteSubcategory)
		})

		r.Route("/products", func(r chi.Router) {
			r.Get("/", m.handler.ListProducts)
			r.Get("/{id}", m.handler.GetProduct)
			r.Post("/", m.handler.CreateProduct)
			r.Put("/{id}", m.handler.UpdateProduct)
			r.Delete("/{id}", m.handler.DeleteProduct)
		})

		r.Route("/group-buys", func(r chi.Router) {
			r.Get("/", m.handler.ListGroupBuys)
			r.Get("/{id}", m.handler.GetGroupBuy)
			r.Post("/", m.handler.CreateGroupBuy)
			r.Put("/{id}", m.handler.UpdateGroupBuy)
			r.Post("/{id}/status", m.handler.SetGroupBuyStatus)
			r.Delete("/{id}", m.handler.DeleteGroupBuy)
		})

		r.Route("/orders", func(r chi.Router) {
			r.Get("/", m.handler.AdminListOrders)
			r.Get("/{id}", m.handler.AdminGetOrder)
		})

		r.Route("/settings", func(r chi.Router) {
			r.Get("/", m.handler.AdminGetSettings)
			r.With(auth.RequireRole("general", "admin")).Put("/", m.handler.AdminUpdateSettings)
			r.With(auth.RequireRole("general", "admin")).Patch("/", m.handler.AdminUpdateSettings)
		})

		r.Route("/finance", func(r chi.Router) {
			r.Use(auth.RequireRole("general", "admin"))
			r.Get("/stats", m.handler.AdminFinanceStats)
			r.Get("/accruals", m.handler.AdminListFinanceAccruals)
			r.Post("/pay/courier", m.handler.AdminPayCourier)
			r.Post("/pay/kurator", m.handler.AdminPayKurator)
		})

		r.Route("/customers", func(r chi.Router) {
			r.Get("/", m.handler.ListCustomers)
			r.Get("/{id}", m.handler.GetCustomer)
			r.Post("/", m.handler.CreateCustomer)
			r.Put("/{id}", m.handler.UpdateCustomer)
			r.Delete("/{id}", m.handler.DeleteCustomer)
			r.Post("/{id}/block", m.handler.BlockCustomer)
			r.Post("/{id}/unblock", m.handler.UnblockCustomer)
		})
	})
}
