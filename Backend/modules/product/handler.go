package product

import (
	"encoding/json"
	"errors"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"diller-backend/internal/pkg/httputil"
	"diller-backend/internal/pkg/upload"
)

const maxMultipartMemory = 32 << 20 // 32 MB

type Handler struct {
	service *Service
	storage *upload.Storage
}

func NewHandler(service *Service, storage *upload.Storage) *Handler {
	return &Handler{service: service, storage: storage}
}

func parseCreateForm(r *http.Request, storage *upload.Storage) (CreateInput, error) {
	if err := r.ParseMultipartForm(maxMultipartMemory); err != nil {
		return CreateInput{}, validationError("body", "Forma ma'lumotlarini o'qib bo'lmadi")
	}

	input, err := parseCommonFields(r)
	if err != nil {
		return CreateInput{}, err
	}

	files := collectImageFiles(r)
	urls, err := storage.SaveProductImages(files)
	if err != nil {
		return CreateInput{}, validationError("images", err.Error())
	}
	input.Images = urls
	return input, nil
}

func parseUpdateForm(r *http.Request, storage *upload.Storage) (UpdateInput, error) {
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(maxMultipartMemory); err != nil {
			return UpdateInput{}, validationError("body", "Forma ma'lumotlarini o'qib bo'lmadi")
		}

		createLike, err := parseCommonFields(r)
		if err != nil {
			return UpdateInput{}, err
		}

		out := UpdateInput{
			Name:          createLike.Name,
			Description:   createLike.Description,
			CategoryID:    createLike.CategoryID,
			SubcategoryID: createLike.SubcategoryID,
			Price:         createLike.Price,
			Quantity:      createLike.Quantity,
			MOQ:           createLike.MOQ,
			PaymentTerm:   createLike.PaymentTerm,
			PaymentDays:   createLike.PaymentDays,
			Specs:         createLike.Specs,
		}

		files := collectImageFiles(r)
		if len(files) > 0 {
			urls, err := storage.SaveProductImages(files)
			if err != nil {
				return UpdateInput{}, validationError("images", err.Error())
			}
			out.Images = urls
			out.HasNewImages = true
		}
		return out, nil
	}

	var body struct {
		Name          string          `json:"name"`
		Description   json.RawMessage `json:"description"`
		CategoryID    int64           `json:"category_id"`
		SubcategoryID int64           `json:"subcategory_id"`
		Price         float64         `json:"price"`
		Quantity      int             `json:"quantity"`
		MOQ           int             `json:"moq"`
		PaymentTerm   string          `json:"payment_term"`
		PaymentDays   int             `json:"payment_days"`
		Specs         json.RawMessage `json:"specs"`
	}
	if field, message, err := httputil.DecodeJSON(r, &body); err != nil {
		return UpdateInput{}, validationError(field, message)
	}

	return UpdateInput{
		Name:          body.Name,
		Description:   body.Description,
		CategoryID:    body.CategoryID,
		SubcategoryID: body.SubcategoryID,
		Price:         body.Price,
		Quantity:      body.Quantity,
		MOQ:           body.MOQ,
		PaymentTerm:   body.PaymentTerm,
		PaymentDays:   body.PaymentDays,
		Specs:         body.Specs,
	}, nil
}

func parseCommonFields(r *http.Request) (CreateInput, error) {
	name := strings.TrimSpace(r.FormValue("name"))
	descRaw := strings.TrimSpace(r.FormValue("description"))
	if descRaw == "" {
		return CreateInput{}, validationError("description", "Tavsif (Delta) kiritilishi shart")
	}

	var desc json.RawMessage
	if err := json.Unmarshal([]byte(descRaw), &desc); err != nil {
		return CreateInput{}, validationError("description", "Tavsif Delta JSON formatida bo'lishi kerak")
	}

	categoryID, err := parseInt64Field(r.FormValue("category_id"), "category_id")
	if err != nil {
		return CreateInput{}, err
	}
	subcategoryID, err := parseInt64Field(r.FormValue("subcategory_id"), "subcategory_id")
	if err != nil {
		return CreateInput{}, err
	}
	price, err := parseFloatField(r.FormValue("price"), "price")
	if err != nil {
		return CreateInput{}, err
	}
	quantity, err := parseIntField(r.FormValue("quantity"), "quantity")
	if err != nil {
		return CreateInput{}, err
	}
	moq, err := parseOptionalIntField(r.FormValue("moq"), "moq", 1)
	if err != nil {
		return CreateInput{}, err
	}
	paymentTerm := strings.TrimSpace(r.FormValue("payment_term"))
	if paymentTerm == "" {
		paymentTerm = PaymentTermPrepay100
	}
	paymentDays, err := parseOptionalIntField(r.FormValue("payment_days"), "payment_days", 0)
	if err != nil {
		return CreateInput{}, err
	}
	specs, err := parseSpecsField(r.FormValue("specs"))
	if err != nil {
		return CreateInput{}, err
	}

	return CreateInput{
		Name:          name,
		Description:   desc,
		CategoryID:    categoryID,
		SubcategoryID: subcategoryID,
		Price:         price,
		Quantity:      quantity,
		MOQ:           moq,
		PaymentTerm:   paymentTerm,
		PaymentDays:   paymentDays,
		Specs:         specs,
	}, nil
}

func collectImageFiles(r *http.Request) []*multipart.FileHeader {
	if r.MultipartForm == nil {
		return nil
	}
	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		files = r.MultipartForm.File["images[]"]
	}
	return files
}

func parseInt64Field(raw, field string) (int64, error) {
	if strings.TrimSpace(raw) == "" {
		return 0, validationError(field, field+" kiritilishi shart")
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || v <= 0 {
		return 0, validationError(field, field+" musbat butun son bo'lishi kerak")
	}
	return v, nil
}

func parseIntField(raw, field string) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return 0, validationError(field, field+" kiritilishi shart")
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0, validationError(field, field+" butun son bo'lishi kerak")
	}
	return v, nil
}

func parseOptionalIntField(raw, field string, def int) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return def, nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0, validationError(field, field+" butun son bo'lishi kerak")
	}
	return v, nil
}

func parseSpecsField(raw string) (json.RawMessage, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var specs json.RawMessage
	if err := json.Unmarshal([]byte(raw), &specs); err != nil {
		return nil, validationError("specs", "specs JSON obyekt bo'lishi kerak")
	}
	return specs, nil
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
	case errors.Is(err, ErrForbidden):
		httputil.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrBadStatus):
		httputil.Error(w, http.StatusConflict, "Mahsulot holati bu amal uchun mos emas")
	case errors.Is(err, ErrCodeTaken):
		httputil.FieldError(w, http.StatusConflict, "code", err.Error())
	case errors.Is(err, ErrCategory):
		httputil.Error(w, http.StatusBadRequest, "Kategoriya yoki subkategoriya topilmadi")
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

func parseQueryInt64(w http.ResponseWriter, r *http.Request, field string) (int64, bool) {
	value := r.URL.Query().Get(field)
	if value == "" {
		return 0, true
	}
	number, err := strconv.ParseInt(value, 10, 64)
	if err != nil || number < 0 {
		httputil.FieldError(w, http.StatusBadRequest, field, field+" manfiy bo'lmagan butun son bo'lishi kerak")
		return 0, false
	}
	return number, true
}
