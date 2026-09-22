package app

import (
	"context"
	"fmt"
	"log/slog"

	"diller-backend/internal/config"
	"diller-backend/internal/pkg/database"
	"diller-backend/internal/pkg/httpserver"
	"diller-backend/internal/pkg/upload"
	"diller-backend/migrations_birga"
	"diller-backend/modules/admin"
	"diller-backend/modules/birgaxarid"
	"diller-backend/modules/category"
	"diller-backend/modules/dostavka"
	"diller-backend/modules/eskiz"
	"diller-backend/modules/ishlabchiqaruvchi"
	"diller-backend/modules/kurator"
	"diller-backend/modules/notification"
	"diller-backend/modules/order"
	"diller-backend/modules/product"
	"diller-backend/modules/region"
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

	if err := database.EnsureDatabase(ctx, cfg.BirgaDatabase.SystemDSN(), cfg.BirgaDatabase.Name); err != nil {
		return fmt.Errorf("birga xarid bazasini tayyorlab bo'lmadi: %w", err)
	}
	if err := database.MigrateFS(cfg.BirgaDatabaseDSN(), migrationsbirga.FS); err != nil {
		return fmt.Errorf("birga xarid migratsiyasi bajarilmadi: %w", err)
	}
	birgaPool, err := database.NewPool(ctx, cfg.BirgaDatabaseDSN())
	if err != nil {
		return fmt.Errorf("birga xarid bazasiga ulanib bo'lmadi: %w", err)
	}
	defer birgaPool.Close()
	slog.Info("Birga Xarid bazasiga ulanildi", "baza", cfg.BirgaDatabase.Name)

	storage, err := upload.New(cfg.Upload.Dir, cfg.Upload.PublicBaseURL)
	if err != nil {
		return fmt.Errorf("upload tizimini ishga tushirib bo'lmadi: %w", err)
	}

	eskizModule := eskiz.NewModule(pool, cfg.Eskiz, cfg.JWT.Secret)
	adminModule := admin.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL(), eskizModule.Service)
	xaridorModule := xaridor.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL(), eskizModule.Service)
	dostavkaModule := dostavka.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL(), eskizModule.Service)
	ishlabChiqaruvchiModule := ishlabchiqaruvchi.NewModule(pool, cfg.JWT.Secret, cfg.JWTTTL(), eskizModule.Service)
	categoryModule := category.NewModule(pool, cfg.JWT.Secret)
	regionModule := region.NewModule(pool, cfg.JWT.Secret)
	productModule := product.NewModule(pool, cfg.JWT.Secret, storage)
	notificationModule := notification.NewModule(pool, cfg.JWT.Secret)
	orderModule := order.NewModule(pool, cfg.JWT.Secret, storage, notificationModule.Service)
	go orderModule.Service.StartDeadlineWatcher(ctx)
	kuratorModule := kurator.NewModule(pool, cfg.JWT.Secret, notificationModule.Service)
	birgaXaridModule := birgaxarid.NewModule(birgaPool, cfg.JWT.Secret, cfg.JWTTTL(), storage, eskizModule.Service, dostavkaModule.Service)

	router := NewRouter(
		cfg, storage,
		adminModule, xaridorModule, dostavkaModule, ishlabChiqaruvchiModule, categoryModule, regionModule, productModule,
		orderModule, notificationModule, kuratorModule, birgaXaridModule,
	)

	return httpserver.Start(cfg.HTTPPort, router, cfg.AppEnv)
}
