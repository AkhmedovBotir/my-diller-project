package httputil

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, errorResponse{
		Code:    statusCode(status),
		Message: message,
	})
}

func FieldError(w http.ResponseWriter, status int, field, message string) {
	JSON(w, status, errorResponse{
		Code:    statusCode(status),
		Message: message,
		Field:   field,
	})
}

// DecodeJSON JSON tanasini qat'iy tekshiradi: noma'lum maydonlar va
// noto'g'ri qiymat turlari aniq maydon nomi bilan qaytariladi.
func DecodeJSON(r *http.Request, dst any) (field string, message string, err error) {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		var typeErr *json.UnmarshalTypeError
		var syntaxErr *json.SyntaxError
		switch {
		case errors.As(err, &typeErr):
			return typeErr.Field, fmt.Sprintf("%s maydonining qiymat turi noto'g'ri", typeErr.Field), err
		case errors.As(err, &syntaxErr):
			return "body", fmt.Sprintf(
				"JSON formati %d-pozitsiyada noto'g'ri",
				syntaxErr.Offset,
			), err
		case errors.Is(err, io.EOF):
			return "body", "So'rov tanasi bo'sh", err
		case strings.HasPrefix(err.Error(), "json: unknown field "):
			field := strings.Trim(strings.TrimPrefix(err.Error(), "json: unknown field "), `"`)
			return field, fmt.Sprintf("%s maydoni mavjud emas", field), err
		default:
			return "body", "JSON formati noto'g'ri", err
		}
	}

	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return "body", "So'rov tanasida faqat bitta JSON obyekt bo'lishi kerak", err
	}

	return "", "", nil
}

func statusCode(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "NOTOGRI_SOROV"
	case http.StatusUnauthorized:
		return "AUTENTIFIKATSIYA_XATOSI"
	case http.StatusForbidden:
		return "RUXSAT_YOQ"
	case http.StatusNotFound:
		return "TOPILMADI"
	case http.StatusConflict:
		return "TAKRORIY_MALUMOT"
	default:
		return "ICHKI_SERVER_XATOSI"
	}
}
