package region

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
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
	typ := r.URL.Query().Get("type")
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "active"
	}
	if r.URL.Query().Get("status") == "all" {
		status = ""
	}

	var parentID *int64
	if raw := r.URL.Query().Get("parent_id"); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || v <= 0 {
			httputil.FieldError(w, http.StatusBadRequest, "parent_id", "parent_id noto'g'ri")
			return
		}
		parentID = &v
	}

	limit := 500
	if raw := r.URL.Query().Get("limit"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			httputil.FieldError(w, http.StatusBadRequest, "limit", "limit butun son bo'lishi kerak")
			return
		}
		limit = v
	}
	offset := 0
	if raw := r.URL.Query().Get("offset"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			httputil.FieldError(w, http.StatusBadRequest, "offset", "offset butun son bo'lishi kerak")
			return
		}
		offset = v
	}

	items, err := h.service.List(r.Context(), typ, parentID, status, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}
	item, err := h.service.Create(r.Context(), input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
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
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}
	if err := h.service.Delete(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) Import(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = filepath.Join("script", "regions.json")
	}

	ct := r.Header.Get("Content-Type")
	if r.ContentLength > 0 && (ct == "application/json" || ct == "application/octet-stream") {
		data, err := io.ReadAll(io.LimitReader(r.Body, 64<<20))
		if err != nil {
			httputil.FieldError(w, http.StatusBadRequest, "body", "Faylni o'qib bo'lmadi")
			return
		}
		if len(data) > 0 {
			result, err := h.service.ImportJSON(r.Context(), data)
			if err != nil {
				h.writeError(w, err)
				return
			}
			httputil.JSON(w, http.StatusOK, result)
			return
		}
	}

	result, err := h.service.ImportFromFile(r.Context(), path)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, result)
}

func (h *Handler) ListKuratorMFYs(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}
	items, err := h.service.ListKuratorMFYs(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) SetKuratorMFYs(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}
	var input SetKuratorMFYsInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}
	if err := h.service.SetKuratorMFYs(r.Context(), id, input.MFYIDs); err != nil {
		h.writeError(w, err)
		return
	}
	items, err := h.service.ListKuratorMFYs(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) MyKuratorMFYs(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	items, err := h.service.ListKuratorMFYs(r.Context(), claims.SubjectID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func parsePathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	raw := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "id", "id noto'g'ri")
		return 0, false
	}
	return id, true
}

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	var ve *ValidationError
	if errors.As(err, &ve) {
		httputil.FieldError(w, http.StatusBadRequest, ve.Field, ve.Message)
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrHasChildren):
		httputil.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, ErrConflict):
		httputil.Error(w, http.StatusConflict, err.Error())
	default:
		slog.Error("region xato", "err", err)
		httputil.Error(w, http.StatusInternalServerError, "Ichki server xatosi")
	}
}
