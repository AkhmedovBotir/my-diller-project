// import-regions — regions.json ni PostgreSQL ga yuklash.
//
//	go run ./cmd/import-regions
//	go run ./cmd/import-regions -path script/regions.json
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"diller-backend/internal/config"
	"diller-backend/internal/pkg/database"
	"diller-backend/modules/region"
)

func main() {
	path := flag.String("path", "script/regions.json", "regions.json yo'li")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fail("konfiguratsiya yuklanmadi", err)
	}
	if err := database.Migrate(cfg.DatabaseDSN()); err != nil {
		fail("migratsiya bajarilmadi", err)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DatabaseDSN())
	if err != nil {
		fail("bazaga ulanib bo'lmadi", err)
	}
	defer pool.Close()

	service := region.NewService(region.NewRepository(pool))
	result, err := service.ImportFromFile(ctx, *path)
	if err != nil {
		fail("import bajarilmadi", err)
	}

	fmt.Printf("Import tayyor: total=%d inserted=%d updated=%d\n", result.Total, result.Inserted, result.Updated)
}

func fail(msg string, err error) {
	fmt.Fprintf(os.Stderr, "Xato: %s: %v\n", msg, err)
	os.Exit(1)
}
