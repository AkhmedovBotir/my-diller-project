package order

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/upload"
)

type Module struct {
	handler   *Handler
	jwtSecret string
	Service   *Service
}

// NewModule buyurtmalar modulini yig'adi. notifier sifatida
// notification.Service (yoki uni implement qiluvchi boshqa struktura)
// berilishi mumkin — import tsiklidan qochish uchun Notifier interfeysi ishlatiladi.
func NewModule(pool *pgxpool.Pool, jwtSecret string, storage *upload.Storage, notifier Notifier) *Module {
	repo := NewRepository(pool)
	service := NewService(repo, storage, notifier)
	handler := NewHandler(service)

	return &Module{
		handler:   handler,
		jwtSecret: jwtSecret,
		Service:   service,
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	// Xaridor — buyurtma berish va kuzatish
	r.Route("/xaridor/buyurtmalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectXaridor))

		r.Get("/", m.handler.XaridorList)
		r.Post("/", m.handler.XaridorCreate)
		r.Get("/{id}", m.handler.XaridorGet)
		r.Post("/{id}/receive", m.handler.XaridorReceive)
		r.Post("/{id}/upload-receipt", m.handler.XaridorUploadReceipt)
		r.Post("/{id}/upload-advance-receipt", m.handler.XaridorUploadAdvanceReceipt)
		r.Get("/{id}/contract.pdf", m.handler.XaridorContractPDF)
		r.Get("/{id}/invoice.pdf", m.handler.XaridorInvoicePDF)
	})

	// Ishlab chiqaruvchi — buyurtmalarni bajarish
	r.Route("/ishlabchiqaruvchi/buyurtmalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectIshlabchiqaruvchi))

		r.Get("/", m.handler.ManufacturerList)
		r.Get("/{id}", m.handler.ManufacturerGet)
		r.Post("/{id}/accept", m.handler.ManufacturerAccept)
		r.Post("/{id}/confirm-advance", m.handler.ManufacturerConfirmAdvance)
		r.Post("/{id}/ready", m.handler.ManufacturerReady)
		r.Post("/{id}/ship", m.handler.ManufacturerShip)
		r.Post("/{id}/confirm-payment", m.handler.ManufacturerConfirmPayment)
		r.Get("/{id}/contract.pdf", m.handler.ManufacturerContractPDF)
		r.Get("/{id}/invoice.pdf", m.handler.ManufacturerInvoicePDF)
	})

	// Ishlab chiqaruvchi — platforma komissiyasi
	r.Route("/ishlabchiqaruvchi/komissiyalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectIshlabchiqaruvchi))

		r.Get("/", m.handler.ManufacturerListCommissions)
		r.Post("/{id}/upload-receipt", m.handler.ManufacturerUploadCommissionReceipt)
		r.Post("/{id}/mark-paid", m.handler.ManufacturerMarkCommissionPaid)
		r.Get("/{id}/invoice.pdf", m.handler.ManufacturerCommissionInvoicePDF)
	})

	// Dostavka kompaniyasi — yuk olish/yetkazish
	r.Route("/dostavka/buyurtmalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectDostavka))

		r.Get("/", m.handler.DostavkaList)
		r.Get("/{id}", m.handler.DostavkaGet)
		r.Post("/{id}/pickup", m.handler.DostavkaPickup)
		r.Post("/{id}/deliver", m.handler.DostavkaDeliver)
	})

	// Kurator (yoki umumiy admin) — nazorat va fors-major
	r.Route("/kurator/buyurtmalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.KuratorList)
		r.Get("/{id}", m.handler.KuratorGet)
		r.Post("/{id}/force-majeure", m.handler.KuratorForceMajeure)
		r.Get("/{id}/contract.pdf", m.handler.KuratorContractPDF)
		r.Get("/{id}/invoice.pdf", m.handler.KuratorInvoicePDF)
	})

	// Kurator (yoki umumiy admin) — buyurtma hujjatlari ro'yxati
	r.Route("/kurator/hujjatlar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.KuratorListDocuments)
	})

	// Bosh admin — to'liq nazorat va kafolat
	r.Route("/admin/buyurtmalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))
		r.Use(auth.RequireRole(roleGeneral))

		r.Get("/", m.handler.AdminList)
		r.Get("/{id}", m.handler.AdminGet)
		r.Post("/{id}/guarantee", m.handler.AdminGuarantee)
		r.Get("/{id}/contract.pdf", m.handler.AdminContractPDF)
		r.Get("/{id}/invoice.pdf", m.handler.AdminInvoicePDF)
	})

	// Admin — fors-major xabarnomalari (bosh admin paneli uchun)
	r.Route("/admin/alerts", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/fors-major", m.handler.AdminForsMajorAlerts)
	})

	// Admin — platforma qarzlari
	r.Route("/admin/qarzlar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.AdminListDebts)
		r.Post("/{id}/collect", m.handler.AdminCollectDebt)
		r.Post("/{id}/write-off", m.handler.AdminWriteOffDebt)
	})

	// Admin — komissiyalar boshqaruvi
	r.Route("/admin/komissiyalar", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.AdminListCommissions)
		r.Post("/{id}/confirm-paid", m.handler.AdminConfirmCommissionPaid)
	})

	// Admin — platforma sozlamalari (o'zgartirish faqat bosh admin uchun)
	r.Route("/admin/platform-settings", func(r chi.Router) {
		r.Use(auth.Middleware(m.jwtSecret))
		r.Use(auth.RequireSubject(auth.SubjectAdmin))

		r.Get("/", m.handler.AdminGetSettings)

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireRole(roleGeneral))
			r.Put("/", m.handler.AdminUpdateSettings)
		})
	})
}
