package app

import (
	"context"
	"fmt"
	"log/slog"

	"diller-backend/internal/config"
	"diller-backend/internal/pkg/database"
	"diller-backend/internal/pkg/httpserver"
	"diller-backend/internal/pkg/upload"
	"diller-backend/modules/admin"
	"diller-backend/modules/category"
	"diller-backend/modules/dostavka"
	"diller-backend/modules/ishlabchiqaruvchi"
	"diller-backend/modules/kurator"
	"diller-backend/modules/notification"
	"diller-backend/modules/order"
	"diller-backend/modules/product"
	"diller-backend/modules/xaridor"
)

// Run barcha modullarni yig'ib, ilovani ishga tushiradi.
func Run(cfg *config.Config) error {
	ctx := context.Background()

	if err := database.Migrate(cfg.DatabaseDSN()); err != nil {
		return fmt.Errorf("migratsiyani bajarib bo'lmadi: %w", err)
	}
	slog.Info("Migratsiyalar muvaffaqiyatli bajarildi")

	pool, err := database.NewPool(ctx, cfg.DatabaseDSN())
	if err != nil {
		return fmt.Errorf("ma'lumotlar bazasiga ulanib bo'lmadi: %w", err)
	}
	defer pool.Close()
	slog.Info(
		"Ma'lumotlar bazasiga muvaffaqiyatli ulanildi",
		"manzil", cfg.Database.Host,
		"baza", cfg.Database.Name,
	)

	storage, err := upload.New(cfg.Upload.Dir, cfg.Upload.PublicBaseURL)
	if err != nil {
		return fmt.Errorf("upload tizimini ishga tushirib bo'lmadi: %w", err)
	}

	adminModule := admin.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL())
	xaridorModule := xaridor.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL())
	dostavkaModule := dostavka.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL())
	ishlabChiqaruvchiModule := ishlabchiqaruvchi.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL())
	categoryModule := category.NewModule(pool, cfg.JWT.Secret)
	productModule := product.NewModule(pool, cfg.JWT.Secret, storage)
	notificationModule := notification.NewModule(pool, cfg.JWT.Secret)
	orderModule := order.NewModule(pool, cfg.JWT.Secret, storage, notificationModule.Service)
	go orderModule.Service.StartDeadlineWatcher(ctx)
	kuratorModule := kurator.NewModule(pool, cfg.JWT.Secret, notificationModule.Service)

	router := NewRouter(
		cfg, storage,
		adminModule, xaridorModule, dostavkaModule, ishlabChiqaruvchiModule, categoryModule, productModule,
		orderModule, notificationModule, kuratorModule,
	)

	return httpserver.Start(cfg.HTTPPort, router)
}
