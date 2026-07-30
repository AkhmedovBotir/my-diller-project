package app

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"diller-backend/docs"
	"diller-backend/internal/config"
	"diller-backend/internal/pkg/cors"
	"diller-backend/internal/pkg/httputil"
	"diller-backend/internal/pkg/upload"
	"diller-backend/modules/admin"
	"diller-backend/modules/category"
	"diller-backend/modules/dostavka"
	"diller-backend/modules/ishlabchiqaruvchi"
	"diller-backend/modules/kurator"
	"diller-backend/modules/notification"
	"diller-backend/modules/order"
	"diller-backend/modules/product"
	"diller-backend/modules/region"
	"diller-backend/modules/xaridor"
)

func NewRouter(
	cfg *config.Config,
	storage *upload.Storage,
	adminModule *admin.Module,
	xaridorModule *xaridor.Module,
	dostavkaModule *dostavka.Module,
	ishlabChiqaruvchiModule *ishlabchiqaruvchi.Module,
	categoryModule *category.Module,
	regionModule *region.Module,
	productModule *product.Module,
	orderModule *order.Module,
	notificationModule *notification.Module,
	kuratorModule *kurator.Module,
) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Middleware(cfg.CORS))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	docs.RegisterRoutes(r)
	product.MountUploads(r, storage)

	r.Route("/api/v1", func(api chi.Router) {
		adminModule.RegisterRoutes(api)
		xaridorModule.RegisterRoutes(api)
		dostavkaModule.RegisterRoutes(api)
		ishlabChiqaruvchiModule.RegisterRoutes(api)
		categoryModule.RegisterRoutes(api)
		regionModule.RegisterRoutes(api)
		productModule.RegisterRoutes(api)
		orderModule.RegisterRoutes(api)
		notificationModule.RegisterRoutes(api)
		kuratorModule.RegisterRoutes(api)
	})

	return r
}
