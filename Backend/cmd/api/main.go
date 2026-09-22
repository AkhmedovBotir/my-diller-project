package main

import (
	"log/slog"
	"os"
	"strings"

	"diller-backend/internal/app"
	"diller-backend/internal/config"
	"diller-backend/internal/pkg/console"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Sozlamalarni yuklab bo'lmadi", "xatolik", err)
		os.Exit(1)
	}

	console.EnableWindowsANSI()
	slog.SetDefault(newLogger(cfg.AppEnv))

	if err := app.Run(cfg); err != nil {
		slog.Error("Ilovada xatolik yuz berdi", "xatolik", err)
		os.Exit(1)
	}
}

func newLogger(env string) *slog.Logger {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}

	if strings.EqualFold(env, "production") {
		opts.ReplaceAttr = func(_ []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				return slog.String("time", a.Value.Time().Format("15:04:05"))
			}
			if a.Key == slog.LevelKey {
				return slog.String("level", strings.ToUpper(a.Value.String()))
			}
			return a
		}
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}

	return slog.New(console.NewPrettyHandler(os.Stdout, opts))
}
