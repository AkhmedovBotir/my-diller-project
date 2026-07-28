package ishlabchiqaruvchi

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

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	resp, err := h.service.Login(r.Context(), input)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, resp)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	resp, err := h.service.Register(r.Context(), input)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	item, err := h.service.GetByID(r.Context(), claims.SubjectID)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, ProfileResponse{Ishlabchiqaruvchi: item, ProfileComplete: ProfileComplete(item)})
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	var input UpdateProfileInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	item, err := h.service.UpdateProfile(r.Context(), claims.SubjectID, input)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, ProfileResponse{Ishlabchiqaruvchi: item, ProfileComplete: ProfileComplete(item)})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	var input CreateInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	// Kurator faqat o'ziga tegishli ishlab chiqaruvchi yarata oladi — kurator_id
	// har doim o'z ID'siga majburlanadi, xaridor/frontend tomonidan yuborilgan
	// qiymatdan qat'iy nazar.
	if claims != nil && claims.Role == roleKurator {
		subjectID := claims.SubjectID
		input.KuratorID = &subjectID
	}

	item, err := h.service.Create(r.Context(), input)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	if limit > 100 {
		httputil.FieldError(
			w,
			http.StatusBadRequest,
			"limit",
			"limit 100 dan katta bo'lishi mumkin emas",
		)
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}

	items, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "ID musbat butun son bo'lishi kerak")
		return
	}

	item, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "ID musbat butun son bo'lishi kerak")
		return
	}

	var input UpdateInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	item, err := h.service.Update(r.Context(), id, input)
	if err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "ID musbat butun son bo'lishi kerak")
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}

	httputil.JSON(w, http.StatusNoContent, nil)
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
	case errors.Is(err, ErrInvalidCredentials):
		httputil.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrUsernameTaken):
		httputil.FieldError(w, http.StatusConflict, "username", err.Error())
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
