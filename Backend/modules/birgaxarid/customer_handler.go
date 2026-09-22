package birgaxarid

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/httputil"
	"diller-backend/modules/eskiz"
)

func (h *Handler) AuthLogin(w http.ResponseWriter, r *http.Request) {
	var in AuthStartInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	result, err := h.service.AuthLogin(r.Context(), in.Phone)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, result)
}

func (h *Handler) AuthVerify(w http.ResponseWriter, r *http.Request) {
	var in eskiz.VerifyInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	result, err := h.service.AuthVerify(r.Context(), in, h.jwtSecret, h.jwtTTL)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, result)
}

func (h *Handler) AuthResendSMS(w http.ResponseWriter, r *http.Request) {
	var in eskiz.ResendInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	result, err := h.service.AuthResendSMS(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, result)
}

func (h *Handler) AuthMe(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	c, err := h.service.GetCustomer(r.Context(), claims.SubjectID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) AuthUpdateMe(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	var in ProfileInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	c, err := h.service.CompleteProfile(r.Context(), claims.SubjectID, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) CatalogListProducts(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	categoryID, _ := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64)
	subcategoryID, _ := strconv.ParseInt(r.URL.Query().Get("subcategory_id"), 10, 64)
	items, err := h.service.ListProductsFiltered(r.Context(), categoryID, subcategoryID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) CatalogListGroupBuys(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "open"
	}
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListGroupBuys(r.Context(), status, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetCart(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	items, err := h.service.GetCart(r.Context(), claims.SubjectID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) UpsertCartItem(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	var in CartItemInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	items, err := h.service.UpsertCartItem(r.Context(), claims.SubjectID, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) DeleteCartItem(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	groupBuyID, err := strconv.ParseInt(chi.URLParam(r, "groupBuyId"), 10, 64)
	if err != nil || groupBuyID <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, "groupBuyId", "ID noto'g'ri")
		return
	}
	items, err := h.service.DeleteCartItem(r.Context(), claims.SubjectID, groupBuyID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	var in CheckoutInput
	if r.Body != nil && r.ContentLength != 0 {
		_, _, _ = httputil.DecodeJSON(r, &in)
	}
	orders, err := h.service.Checkout(r.Context(), claims.SubjectID, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, orders)
}

func (h *Handler) ListMyOrders(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListMyOrders(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetMyOrder(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetMyOrder(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) CancelMyOrder(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.CancelMyOrder(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) AdminListOrders(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	items, err := h.service.ListOrdersAdmin(r.Context(), status, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminGetOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetOrderAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) CourierListOrders(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListCourierOrders(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) CourierGetOrder(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetCourierOrder(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) CourierClaimOrder(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.ClaimCourierOrder(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) CourierDeliverOrder(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "Avtorizatsiya talab qilinadi")
		return
	}
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in DeliverInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.DeliverCourierOrder(r.Context(), claims.SubjectID, id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) PublicGetSettings(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetSettings(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) AdminGetSettings(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetSettings(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) AdminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var in SettingsInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.UpdateSettings(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) AdminFinanceStats(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetFinanceStats(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) AdminListFinanceAccruals(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	role := strings.TrimSpace(r.URL.Query().Get("role"))
	if role != "" && role != "courier" && role != "kurator" {
		httputil.FieldError(w, http.StatusBadRequest, "role", "role courier yoki kurator bo'lishi kerak")
		return
	}
	var paid *bool
	if raw := strings.TrimSpace(r.URL.Query().Get("paid")); raw != "" {
		switch raw {
		case "true", "1":
			v := true
			paid = &v
		case "false", "0":
			v := false
			paid = &v
		default:
			httputil.FieldError(w, http.StatusBadRequest, "paid", "paid true yoki false bo'lishi kerak")
			return
		}
	}
	items, err := h.service.ListFinanceAccruals(r.Context(), role, paid, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminPayCourier(w http.ResponseWriter, r *http.Request) {
	var in FinancePayInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	n, err := h.service.MarkCourierPaid(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]int64{"updated": n})
}

func (h *Handler) AdminPayKurator(w http.ResponseWriter, r *http.Request) {
	var in FinancePayInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	n, err := h.service.MarkKuratorPaid(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]int64{"updated": n})
}
