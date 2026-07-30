package imageutil

import (
	"bytes"
	"fmt"
	"io"

	"github.com/disintegration/imaging"
)

const (
	maxWidth = 1200
	targetW  = 4
	targetH  = 3
)

// NormalizeProductImage rasmni standart ko'rinishga keltiradi:
// markazdan 4:3 kesish, maksimal o'lcham cheklash, JPEG sifatida qaytarish.
func NormalizeProductImage(r io.Reader) ([]byte, error) {
	src, err := imaging.Decode(r)
	if err != nil {
		return nil, fmt.Errorf("rasmni o'qib bo'lmadi: %w", err)
	}

	cropped := imaging.Fill(src, maxWidth, maxWidth*targetH/targetW, imaging.Center, imaging.Lanczos)
	resized := imaging.Fit(cropped, maxWidth, maxWidth*targetH/targetW, imaging.Lanczos)

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, resized, imaging.JPEG, imaging.JPEGQuality(85)); err != nil {
		return nil, fmt.Errorf("rasmni saqlab bo'lmadi: %w", err)
	}
	return buf.Bytes(), nil
}
