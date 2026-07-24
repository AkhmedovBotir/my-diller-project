// Package migrations SQL migratsiya fayllarini binary ichiga embed qiladi,
// shu tufayli deploy paytida alohida migratsiya fayllari kerak bo'lmaydi.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
