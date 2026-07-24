package product

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

const codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// GenerateCode ABC-XYZ formatida 6 belgili unikal kod yaratadi.
func GenerateCode() (string, error) {
	part := func() (string, error) {
		out := make([]byte, 3)
		for i := 0; i < 3; i++ {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
			if err != nil {
				return "", fmt.Errorf("mahsulot kodini yaratib bo'lmadi: %w", err)
			}
			out[i] = codeAlphabet[n.Int64()]
		}
		return string(out), nil
	}

	left, err := part()
	if err != nil {
		return "", err
	}
	right, err := part()
	if err != nil {
		return "", err
	}
	return left + "-" + right, nil
}
