package httpserver

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"diller-backend/internal/pkg/console"
)

// Start HTTP serverni ishga tushiradi va graceful shutdown'ni boshqaradi.
func Start(port string, handler http.Handler, env string) error {
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  time.Minute,
	}

	p, _ := strconv.Atoi(port)
	if p == 0 {
		p = 8080
	}
	if env == "" {
		env = "development"
	}
	console.Banner(p, env)

	errCh := make(chan error, 1)
	go func() {
		slog.Info("HTTP server ishga tushdi", "port", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return fmt.Errorf("HTTP server xatoligi: %w", err)
	case sig := <-quit:
		slog.Info("Server to'xtatilmoqda", "signal", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("serverni xavfsiz to'xtatib bo'lmadi: %w", err)
	}

	slog.Info("Server xavfsiz to'xtatildi")
	return nil
}
