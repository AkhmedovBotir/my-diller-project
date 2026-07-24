package product

import (
	"net/http"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/httputil"
)

func (h *Handler) AdminList(w http.ResponseWriter, r *http.Request) {
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

	items, err := h.service.ListForAdmin(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	p, err := h.service.GetForAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	input, err := parseUpdateForm(r, h.storage)
	if err != nil {
		h.writeError(w, err)
		return
	}

	p, err := h.service.UpdateByAdmin(r.Context(), id, input)
	if err != nil {
		if input.HasNewImages {
			h.storage.RemoveByURLs(input.Images)
		}
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) AdminApprove(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	p, err := h.service.Approve(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) AdminReject(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input RejectInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	p, err := h.service.Reject(r.Context(), claims.SubjectID, id, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	if err := h.service.DeleteByAdmin(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusNoContent, nil)
}
