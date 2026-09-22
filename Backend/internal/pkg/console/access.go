package console

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

var accessMu sync.Mutex

// AccessLog HTTP so'rovlarini chiroyli formatda yozadi.
// OPTIONS va /health odatda shovqin — o'tkazib yuboriladi.
func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if shouldSkipAccessLog(r) {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}

		path := r.URL.Path
		if q := r.URL.RawQuery; q != "" {
			path = path + "?" + shortenQuery(q)
		}

		methodColor, methodLabel := methodStyle(r.Method)
		statusColor := statusStyle(status)
		bytes := humanBytes(ww.BytesWritten())
		elapsed := formatDuration(time.Since(start))

		line := fmt.Sprintf(
			"%s%s%s  %s%-6s%s %s%-3d%s  %s%-8s%s  %s%-7s%s  %s\n",
			dim, time.Now().Format("15:04:05"), reset,
			methodColor+bold, methodLabel, reset,
			statusColor, status, reset,
			dim, elapsed, reset,
			dim, bytes, reset,
			path,
		)

		accessMu.Lock()
		_, _ = os.Stdout.WriteString(line)
		accessMu.Unlock()
	})
}

func shouldSkipAccessLog(r *http.Request) bool {
	if r.Method == http.MethodOptions {
		return true
	}
	path := r.URL.Path
	return path == "/health" || path == "/favicon.ico"
}

func methodStyle(method string) (color, label string) {
	switch method {
	case http.MethodGet:
		return cyan, "GET"
	case http.MethodPost:
		return green, "POST"
	case http.MethodPut:
		return yellow, "PUT"
	case http.MethodPatch:
		return magenta, "PATCH"
	case http.MethodDelete:
		return red, "DELETE"
	default:
		return dim, method
	}
}

func statusStyle(status int) string {
	switch {
	case status >= 500:
		return red
	case status >= 400:
		return yellow
	case status >= 300:
		return cyan
	default:
		return green
	}
}

func formatDuration(d time.Duration) string {
	if d < time.Millisecond {
		return fmt.Sprintf("%dµs", d.Microseconds())
	}
	if d < time.Second {
		return fmt.Sprintf("%.1fms", float64(d.Microseconds())/1000)
	}
	return fmt.Sprintf("%.2fs", d.Seconds())
}

func humanBytes(n int) string {
	if n < 1024 {
		return fmt.Sprintf("%dB", n)
	}
	if n < 1024*1024 {
		return fmt.Sprintf("%.1fKB", float64(n)/1024)
	}
	return fmt.Sprintf("%.1fMB", float64(n)/(1024*1024))
}

func shortenQuery(q string) string {
	if len(q) <= 48 {
		return q
	}
	return q[:45] + "..."
}

// Banner ishga tushishda chiroyli sarlavha.
func Banner(port int, env string) {
	line := strings.Repeat("─", 42)
	fmt.Printf("\n%s%s%s\n", dim, line, reset)
	fmt.Printf("  %s%sMy Diller API%s\n", bold, green, reset)
	fmt.Printf("  %sport%s    :%d\n", dim, reset, port)
	fmt.Printf("  %senv%s     %s\n", dim, reset, env)
	fmt.Printf("%s%s%s\n\n", dim, line, reset)
}
