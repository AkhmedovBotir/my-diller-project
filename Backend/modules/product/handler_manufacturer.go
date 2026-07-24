package product

import (
	"net/http"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/httputil"
)

func (h *Handler) ManufacturerCreate(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	input, err := parseCreateForm(r, h.storage)
	if err != nil {
		h.writeError(w, err)
		return
	}

	p, err := h.service.CreateByManufacturer(r.Context(), claims.SubjectID, input)
	if err != nil {
		h.storage.RemoveByURLs(input.Images)
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, p)
}

func (h *Handler) ManufacturerList(w http.ResponseWriter, r *http.Request) {
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

	items, err := h.service.ListByManufacturer(r.Context(), claims.SubjectID, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) ManufacturerGet(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	p, err := h.service.GetByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) ManufacturerUpdate(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	input, err := parseUpdateForm(r, h.storage)
	if err != nil {
		h.writeError(w, err)
		return
	}

	p, err := h.service.UpdateByManufacturer(r.Context(), claims.SubjectID, id, input)
	if err != nil {
		if input.HasNewImages {
			h.storage.RemoveByURLs(input.Images)
		}
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) ManufacturerResubmit(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	p, err := h.service.ResubmitByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) ManufacturerDelete(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	if err := h.service.DeleteByManufacturer(r.Context(), claims.SubjectID, id); err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusNoContent, nil)
}
