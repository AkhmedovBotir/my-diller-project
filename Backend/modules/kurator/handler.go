package kurator

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

func (h *Handler) GetDaromad(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	summary, err := h.service.GetDaromadSummary(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, summary)
}

func (h *Handler) CreateTolovSorov(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	var input CreateTolovSorovInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	s, err := h.service.CreateTolovSorov(r.Context(), claims.SubjectID, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, s)
}

func (h *Handler) ListTolovSorovlari(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListTolovSorovlariByKurator(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) ListKomissiyalar(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListKomissiyalarForKurator(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminListTolovSorovlari(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListTolovSorovlariForAdmin(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminPayTolovSorov(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	s, err := h.service.PayTolovSorovByAdmin(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, s)
}

func (h *Handler) AdminRejectTolovSorov(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input RejectTolovSorovInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	s, err := h.service.RejectTolovSorovByAdmin(r.Context(), claims.SubjectID, id, input.AdminNote)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, s)
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
	case errors.Is(err, ErrNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrBadStatus), errors.Is(err, ErrInsufficientBalance):
		httputil.Error(w, http.StatusConflict, err.Error())
	default:
		slog.Error("Ichki xatolik yuz berdi", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "Ichki server xatoligi yuz berdi")
	}
}

func parsePathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "ID musbat butun son bo'lishi kerak")
		return 0, false
	}
	return id, true
}

func parseQueryInt(w http.ResponseWriter, r *http.Request, field string) (int, bool) {
	value := r.URL.Query().Get(field)
	if value == "" {
		return 0, true
	}
	number, err := strconv.Atoi(value)
	if err != nil || number < 0 {
		httputil.FieldError(w, http.StatusBadRequest, field, field+" manfiy bo'lmagan butun son bo'lishi kerak")
		return 0, false
	}
	return number, true
}

func parsePagination(w http.ResponseWriter, r *http.Request) (limit, offset int, ok bool) {
	limit, ok = parseQueryInt(w, r, "limit")
	if !ok {
		return 0, 0, false
	}
	if limit > 100 {
		httputil.FieldError(w, http.StatusBadRequest, "limit", "limit 100 dan katta bo'lishi mumkin emas")
		return 0, 0, false
	}
	offset, ok = parseQueryInt(w, r, "offset")
	if !ok {
		return 0, 0, false
	}
	return limit, offset, true
}
