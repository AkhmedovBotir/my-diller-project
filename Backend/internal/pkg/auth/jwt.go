// Package auth JWT token yaratish, tekshirish va HTTP middleware'larni beradi.
package auth

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"diller-backend/internal/pkg/httputil"
)

const (
	SubjectAdmin             = "admin"
	SubjectIshlabchiqaruvchi = "ishlabchiqaruvchi"
	SubjectXaridor           = "xaridor"
	SubjectDostavka          = "dostavka"
	SubjectBirgaCustomer     = "birga_customer"
)

type Claims struct {
	SubjectID   int64  `json:"subject_id"`
	SubjectType string `json:"subject_type"`
	Role        string `json:"role,omitempty"` // admin turi: general, admin, kurator

	// Eski admin tokenlari bilan moslik (admin_id / admin_type)
	AdminID   int64  `json:"admin_id,omitempty"`
	AdminType string `json:"admin_type,omitempty"`

	jwt.RegisteredClaims
}

type ctxKey struct{}

func GenerateToken(secret string, ttl time.Duration, subjectID int64, subjectType, role string) (string, error) {
	claims := Claims{
		SubjectID:   subjectID,
		SubjectType: subjectType,
		Role:        role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Admin tokenlarida eski maydonlarni ham saqlaymiz (eski frontend/tokenlar uchun)
	if subjectType == SubjectAdmin {
		claims.AdminID = subjectID
		claims.AdminType = role
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("kutilmagan imzolash usuli: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("token yaroqsiz")
	}

	claims.normalize()
	return claims, nil
}

// normalize eski va yangi JWT formatlarini bir xil holatga keltiradi.
func (c *Claims) normalize() {
	if c.SubjectID == 0 && c.AdminID != 0 {
		c.SubjectID = c.AdminID
	}
	if c.SubjectType == "" && c.AdminID != 0 {
		c.SubjectType = SubjectAdmin
	}
	if c.Role == "" && c.AdminType != "" {
		c.Role = c.AdminType
	}
	if c.AdminID == 0 && c.SubjectType == SubjectAdmin && c.SubjectID != 0 {
		c.AdminID = c.SubjectID
	}
	if c.AdminType == "" && c.SubjectType == SubjectAdmin {
		c.AdminType = c.Role
	}
}

// Middleware Authorization: Bearer <token> headerini tekshiradi
// va claims'ni request context'iga joylaydi.
func Middleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				httputil.FieldError(
					w,
					http.StatusUnauthorized,
					"Authorization",
					"Authorization sarlavhasi yo'q yoki noto'g'ri. Bearer token yuboring",
				)
				return
			}

			claims, err := ParseToken(secret, strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				httputil.FieldError(
					w,
					http.StatusUnauthorized,
					"Authorization",
					"Token yaroqsiz yoki amal qilish muddati tugagan",
				)
				return
			}

			ctx := context.WithValue(r.Context(), ctxKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireSubject faqat ko'rsatilgan subject_type (admin, ishlabchiqaruvchi) uchun ruxsat beradi.
func RequireSubject(types ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil || !slices.Contains(types, claims.SubjectType) {
				httputil.Error(w, http.StatusForbidden, "Bu amalni bajarish uchun ruxsatingiz yo'q")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole faqat ko'rsatilgan admin rollariga ruxsat beradi.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil ||
				claims.SubjectType != SubjectAdmin ||
				!slices.Contains(roles, claims.Role) {
				httputil.Error(w, http.StatusForbidden, "Bu amalni bajarish uchun ruxsatingiz yo'q")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireType — RequireRole uchun eski nom (admin moduli mosligi).
func RequireType(types ...string) func(http.Handler) http.Handler {
	return RequireRole(types...)
}

func ClaimsFromContext(ctx context.Context) *Claims {
	claims, _ := ctx.Value(ctxKey{}).(*Claims)
	return claims
}
