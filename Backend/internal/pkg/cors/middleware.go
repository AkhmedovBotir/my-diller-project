package cors

import (
	"net/http"
	"strconv"
	"strings"

	"diller-backend/internal/config"
)

// Middleware config.json dagi CORS sozlamalariga asosan headerlarni qo'yadi
// va OPTIONS preflight so'rovlariga 204 qaytaradi.
func Middleware(cfg config.CORSConfig) func(http.Handler) http.Handler {
	origins := make(map[string]struct{}, len(cfg.AllowedOrigins))
	allowAll := false
	for _, o := range cfg.AllowedOrigins {
		if o == "*" {
			allowAll = true
			break
		}
		origins[o] = struct{}{}
	}

	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")
	maxAge := strconv.Itoa(cfg.MaxAge)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				allowed := allowAll
				if !allowed {
					_, allowed = origins[origin]
				}

				if allowed {
					if allowAll && !cfg.AllowCredentials {
						w.Header().Set("Access-Control-Allow-Origin", "*")
					} else {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						w.Header().Add("Vary", "Origin")
					}

					if cfg.AllowCredentials {
						w.Header().Set("Access-Control-Allow-Credentials", "true")
					}
					w.Header().Set("Access-Control-Allow-Methods", methods)
					w.Header().Set("Access-Control-Allow-Headers", headers)
					w.Header().Set("Access-Control-Max-Age", maxAge)
				}
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
