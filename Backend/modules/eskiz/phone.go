package eskiz

import "strings"

// Digits faqat raqamlarni qoldiradi.
func Digits(raw string) string {
	var b strings.Builder
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// NormalizePhone Eskiz uchun 998XXXXXXXXX formatiga keltiradi.
func NormalizePhone(raw string) (string, error) {
	digits := Digits(raw)
	switch {
	case len(digits) == 12 && strings.HasPrefix(digits, "998"):
		return digits, nil
	case len(digits) == 9:
		return "998" + digits, nil
	case len(digits) == 10 && strings.HasPrefix(digits, "0"):
		return "998" + digits[1:], nil
	case len(digits) == 11 && strings.HasPrefix(digits, "8"):
		return "998" + digits[1:], nil
	default:
		return "", ErrPhoneInvalid
	}
}

// MaskPhone +998 90 *** ** 67 ko'rinishini qaytaradi.
func MaskPhone(raw string) string {
	phone, err := NormalizePhone(raw)
	if err != nil || len(phone) != 12 {
		return "+998 ** *** ** **"
	}
	return "+998 " + phone[3:5] + " *** ** " + phone[10:12]
}

// LookupCandidates login yoki telefon variantlarini qaytaradi.
func LookupCandidates(login string) []string {
	seen := map[string]struct{}{}
	var out []string
	add := func(v string) {
		v = strings.TrimSpace(v)
		if v == "" {
			return
		}
		if _, ok := seen[v]; ok {
			return
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	add(login)
	if digits := Digits(login); digits != "" {
		add(digits)
	}
	if phone, err := NormalizePhone(login); err == nil {
		add(phone)
		add("+" + phone)
	}
	return out
}
