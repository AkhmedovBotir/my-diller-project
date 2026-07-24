// create-admin — general turdagi admin yaratish uchun CLI buyruq.
//
// Ishlatilishi:
//
//	go run ./cmd/create-admin -first-name Ali -last-name Valiyev -phone +998901234567 -username admin -password secret123
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"diller-backend/internal/config"
	"diller-backend/internal/pkg/database"
	"diller-backend/modules/admin"
)

func main() {
	firstName := flag.String("first-name", "", "Admin ismi (majburiy)")
	lastName := flag.String("last-name", "", "Admin familyasi (majburiy)")
	phone := flag.String("phone", "", "Telefon raqam (majburiy)")
	username := flag.String("username", "", "Username (majburiy)")
	password := flag.String("password", "", "Parol, kamida 6 belgi (majburiy)")
	flag.Parse()

	if *firstName == "" || *lastName == "" || *phone == "" || *username == "" || *password == "" {
		fmt.Println("Barcha maydonlar majburiy. Ishlatilishi:")
		flag.PrintDefaults()
		os.Exit(1)
	}

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

	service := admin.NewService(admin.NewRepository(pool), cfg.JWT.Secret, cfg.JWTTTL())

	a, err := service.Create(ctx, admin.CreateAdminInput{
		FirstName: *firstName,
		LastName:  *lastName,
		Phone:     *phone,
		Username:  *username,
		Password:  *password,
		Type:      admin.TypeGeneral,
	})
	if err != nil {
		fail("admin yaratilmadi", err)
	}

	fmt.Printf("General admin yaratildi: id=%d, username=%s, ism=%s %s\n",
		a.ID, a.Username, a.FirstName, a.LastName)
}

func fail(msg string, err error) {
	fmt.Fprintf(os.Stderr, "Xato: %s: %v\n", msg, err)
	os.Exit(1)
}
