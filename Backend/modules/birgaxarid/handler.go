package birgaxarid

import (
	"encoding/json"
	"errors"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"diller-backend/internal/pkg/httputil"
	"diller-backend/internal/pkg/upload"
	"diller-backend/modules/eskiz"
)

const maxMultipartMemory = 16 << 20 // 16 MB

type Handler struct {
	service   *Service
	storage   *upload.Storage
	jwtSecret string
	jwtTTL    time.Duration
}

func NewHandler(service *Service, storage *upload.Storage, jwtSecret string, jwtTTL time.Duration) *Handler {
	return &Handler{service: service, storage: storage, jwtSecret: jwtSecret, jwtTTL: jwtTTL}
}

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	if eskiz.WriteError(w, err) {
		return
	}
	switch {
	case errors.Is(err, ErrValidation):
		var ve *ValidationError
		if errors.As(err, &ve) {
			httputil.FieldError(w, http.StatusBadRequest, ve.Field, ve.Message)
			return
		}
		httputil.Error(w, http.StatusBadRequest, "Kiritilgan ma'lumotlar noto'g'ri")
	case errors.Is(err, ErrNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrNameTaken):
		httputil.FieldError(w, http.StatusConflict, "name", err.Error())
	case errors.Is(err, ErrPhoneTaken):
		httputil.FieldError(w, http.StatusConflict, "phone", err.Error())
	case errors.Is(err, ErrConflict):
		httputil.Error(w, http.StatusConflict, "Bog'liq yozuvlar mavjud — o'chirib bo'lmaydi")
	default:
		slog.Error("Birga Xarid xatolik", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "Ichki server xatoligi yuz berdi")
	}
}

func parseID(w http.ResponseWriter, r *http.Request) (int64, bool) {
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
	n, err := strconv.Atoi(value)
	if err != nil || n < 0 {
		httputil.FieldError(w, http.StatusBadRequest, field, field+" noto'g'ri")
		return 0, false
	}
	return n, true
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var in CategoryInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.CreateCategory(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListCategories(r.Context(), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetCategory(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in CategoryInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.UpdateCategory(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.service.DeleteCategory(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateSubcategory(w http.ResponseWriter, r *http.Request) {
	var in SubcategoryInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.CreateSubcategory(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListSubcategories(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	categoryID, _ := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64)
	items, err := h.service.ListSubcategories(r.Context(), categoryID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) UpdateSubcategory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in SubcategoryInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.UpdateSubcategory(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteSubcategory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.service.DeleteSubcategory(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	in, err := h.parseProductForm(r, true)
	if err != nil {
		var ve *ValidationError
		if errors.As(err, &ve) {
			httputil.FieldError(w, http.StatusBadRequest, ve.Field, ve.Message)
			return
		}
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	item, err := h.service.CreateProduct(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	categoryID, _ := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64)
	items, err := h.service.ListProducts(r.Context(), categoryID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetProduct(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	in, err := h.parseProductForm(r, false)
	if err != nil {
		var ve *ValidationError
		if errors.As(err, &ve) {
			httputil.FieldError(w, http.StatusBadRequest, ve.Field, ve.Message)
			return
		}
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	item, err := h.service.UpdateProduct(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) parseProductForm(r *http.Request, requirePhoto bool) (ProductInput, error) {
	ct := r.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "multipart/form-data") {
		return ProductInput{}, validationError("body", "Mahsulot multipart/form-data formatida yuborilishi kerak")
	}
	if err := r.ParseMultipartForm(maxMultipartMemory); err != nil {
		return ProductInput{}, validationError("body", "Forma ma'lumotlarini o'qib bo'lmadi")
	}

	categoryID, _ := strconv.ParseInt(r.FormValue("category_id"), 10, 64)
	var subcategoryID *int64
	if raw := strings.TrimSpace(r.FormValue("subcategory_id")); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err == nil && id > 0 {
			subcategoryID = &id
		}
	}
	price, _ := strconv.ParseInt(r.FormValue("price"), 10, 64)
	stock, _ := strconv.Atoi(r.FormValue("stock"))

	active := true
	if raw := strings.TrimSpace(r.FormValue("is_active")); raw != "" {
		active = raw == "true" || raw == "1" || raw == "on"
	}
	activePtr := &active

	in := ProductInput{
		CategoryID:    categoryID,
		SubcategoryID: subcategoryID,
		Name:          r.FormValue("name"),
		Description:   r.FormValue("description"),
		Unit:          r.FormValue("unit"),
		Price:         price,
		Stock:         stock,
		IsActive:      activePtr,
	}

	file := firstFormFile(r, "photo")
	if file != nil {
		url, err := h.storage.SaveBirgaImage(file)
		if err != nil {
			return ProductInput{}, validationError("photo", err.Error())
		}
		in.PhotoURL = url
	} else if requirePhoto {
		return ProductInput{}, validationError("photo", "Mahsulot rasmi yuklanishi shart")
	}

	return in, nil
}

func firstFormFile(r *http.Request, field string) *multipart.FileHeader {
	if r.MultipartForm == nil {
		return nil
	}
	files := r.MultipartForm.File[field]
	if len(files) == 0 {
		return nil
	}
	return files[0]
}

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.service.DeleteProduct(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateGroupBuy(w http.ResponseWriter, r *http.Request) {
	in, err := h.parseGroupBuyForm(r, true)
	if err != nil {
		h.writeError(w, err)
		return
	}
	item, err := h.service.CreateGroupBuy(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListGroupBuys(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListGroupBuys(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetGroupBuy(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetGroupBuy(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) UpdateGroupBuy(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	in, err := h.parseGroupBuyForm(r, false)
	if err != nil {
		h.writeError(w, err)
		return
	}
	if len(in.PhotoURLs) == 0 {
		current, getErr := h.service.GetGroupBuy(r.Context(), id)
		if getErr != nil {
			h.writeError(w, getErr)
			return
		}
		in.PhotoURLs = current.PhotoURLs
	}
	item, err := h.service.UpdateGroupBuy(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) parseGroupBuyForm(r *http.Request, requirePhotos bool) (GroupBuyInput, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(maxMultipartMemory); err != nil {
			return GroupBuyInput{}, validationError("body", "Forma ma'lumotlarini o'qib bo'lmadi")
		}
		return h.buildGroupBuyFromForm(r, requirePhotos)
	}

	var in GroupBuyInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		return GroupBuyInput{}, validationError(field, msg)
	}
	if requirePhotos && len(in.PhotoURLs) < 1 {
		return GroupBuyInput{}, validationError("photos", "Kamida 1 ta rasm yuklanishi shart")
	}
	return in, nil
}

func (h *Handler) buildGroupBuyFromForm(r *http.Request, requirePhotos bool) (GroupBuyInput, error) {
	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = "product"
	}
	price, _ := strconv.ParseInt(r.FormValue("price"), 10, 64)
	minVolume, _ := strconv.Atoi(r.FormValue("min_volume"))
	stock, _ := strconv.Atoi(r.FormValue("stock"))

	var productID *int64
	if raw := strings.TrimSpace(r.FormValue("product_id")); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err == nil && id > 0 {
			productID = &id
		}
	}

	var items []GroupBuyItemInput
	if raw := strings.TrimSpace(r.FormValue("items")); raw != "" {
		if err := json.Unmarshal([]byte(raw), &items); err != nil {
			return GroupBuyInput{}, validationError("items", "Combo tarkibi noto'g'ri")
		}
	}

	photos := make([]string, 0, 5)
	existing := make([]string, 5)
	if raw := strings.TrimSpace(r.FormValue("existing_urls")); raw != "" {
		var parsed []string
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			for i := 0; i < 5 && i < len(parsed); i++ {
				existing[i] = strings.TrimSpace(parsed[i])
			}
		}
	}

	for i := 0; i < 5; i++ {
		file := firstFormFile(r, "photo_"+strconv.Itoa(i))
		if file != nil {
			url, err := h.storage.SaveBirgaImage(file)
			if err != nil {
				return GroupBuyInput{}, validationError("photos", err.Error())
			}
			photos = append(photos, url)
			continue
		}
		if existing[i] != "" {
			photos = append(photos, existing[i])
		}
	}

	if len(photos) > 5 {
		photos = photos[:5]
	}
	if requirePhotos && len(photos) < 1 {
		return GroupBuyInput{}, validationError("photos", "Kamida 1 ta rasm yuklanishi shart")
	}

	title := strings.TrimSpace(r.FormValue("title"))
	return GroupBuyInput{
		Kind:        kind,
		Title:       title,
		Description: r.FormValue("description"),
		ProductID:   productID,
		Price:       price,
		MinVolume:   minVolume,
		Stock:       stock,
		PhotoURLs:   photos,
		Items:       items,
	}, nil
}

func (h *Handler) SetGroupBuyStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in GroupBuyStatusInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.SetGroupBuyStatus(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteGroupBuy(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.service.DeleteGroupBuy(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateCustomer(w http.ResponseWriter, r *http.Request) {
	var in CustomerInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.CreateCustomer(r.Context(), in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseQueryInt(w, r, "limit")
	if !ok {
		return
	}
	offset, ok := parseQueryInt(w, r, "offset")
	if !ok {
		return
	}
	items, err := h.service.ListCustomers(r.Context(), r.URL.Query().Get("search"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.GetCustomer(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in CustomerInput
	if field, msg, err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, msg)
		return
	}
	item, err := h.service.UpdateCustomer(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.service.DeleteCustomer(r.Context(), id); err != nil {
		h.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) BlockCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in BlockInput
	_, _, _ = httputil.DecodeJSON(r, &in)
	item, err := h.service.BlockCustomer(r.Context(), id, in)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}

func (h *Handler) UnblockCustomer(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	item, err := h.service.UnblockCustomer(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, item)
}
