package product

import (
	"net/http"

	"diller-backend/internal/pkg/httputil"
)

func (h *Handler) CatalogList(w http.ResponseWriter, r *http.Request) {
	categoryID, ok := parseQueryInt64(w, r, "category_id")
	if !ok {
		return
	}
	subcategoryID, ok := parseQueryInt64(w, r, "subcategory_id")
	if !ok {
		return
	}
	manufacturerID, ok := parseQueryInt64(w, r, "ishlabchiqaruvchi_id")
	if !ok {
		return
	}
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
	search := r.URL.Query().Get("search")

	items, err := h.service.ListCatalog(r.Context(), categoryID, subcategoryID, manufacturerID, search, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) CatalogGet(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	p, err := h.service.GetCatalog(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, p)
}

func (h *Handler) CatalogManufacturers(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListCatalogManufacturers(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}
