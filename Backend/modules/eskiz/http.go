package eskiz

import (
	"errors"
	"net/http"

	"diller-backend/internal/pkg/httputil"
)

// WriteError SMS/OTP xatolarini HTTP javobga o'giradi.
func WriteError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}

	var fieldErr *FieldError
	if errors.As(err, &fieldErr) {
		httputil.FieldError(w, http.StatusBadRequest, fieldErr.Field, fieldErr.Message)
		return true
	}

	switch {
	case errors.Is(err, ErrInvalidCode),
		errors.Is(err, ErrExpired),
		errors.Is(err, ErrConsumed),
		errors.Is(err, ErrMaxAttempts),
		errors.Is(err, ErrPhoneInvalid):
		field := "code"
		if errors.Is(err, ErrPhoneInvalid) {
			field = "phone"
		}
		httputil.FieldError(w, http.StatusBadRequest, field, err.Error())
		return true
	case errors.Is(err, ErrChallengeNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
		return true
	case errors.Is(err, ErrTooSoon):
		httputil.Error(w, http.StatusTooManyRequests, err.Error())
		return true
	case errors.Is(err, ErrSendFailed), errors.Is(err, ErrNotConfigured):
		httputil.Error(w, http.StatusBadGateway, err.Error())
		return true
	default:
		return false
	}
}
