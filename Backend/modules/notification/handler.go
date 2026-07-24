package notification

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/httputil"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	if limit > 100 {
		httputil.FieldError(w, http.StatusBadRequest, "limit", "limit 100 dan katta bo'lishi mumkin emas")
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}

	items, err := h.service.List(r.Context(), claims.SubjectType, claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "ID musbat butun son bo'lishi kerak")
		return
	}

	n, err := h.service.MarkRead(r.Context(), claims.SubjectType, claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, n)
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	if err := h.service.MarkAllRead(r.Context(), claims.SubjectType, claims.SubjectID); err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		var validationErr *ValidationError
		if errors.As(err, &validationErr) {
			httputil.FieldError(w, http.StatusBadRequest, validationErr.Field, validationErr.Message)
			return
		}
		httputil.Error(w, http.StatusBadRequest, "Kiritilgan ma'lumotlar noto'g'ri")
	case errors.Is(err, ErrForbidden):
		httputil.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	default:
		slog.Error("Ichki xatolik yuz berdi", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "Ichki server xatoligi yuz berdi")
	}
}

func parseQueryInt(w http.ResponseWriter, r *http.Request, field string) (int, bool) {
	value := r.URL.Query().Get(field)
	if value == "" {
		return 0, true
	}

	number, err := strconv.Atoi(value)
	if err != nil || number < 0 {
		httputil.FieldError(
			w,
			http.StatusBadRequest,
			field,
			field+" manfiy bo'lmagan butun son bo'lishi kerak",
		)
		return 0, false
	}
	return number, true
}
