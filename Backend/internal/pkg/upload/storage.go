package upload

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"diller-backend/internal/pkg/imageutil"
)

const (
	MaxImageBytes = 5 << 20 // 5 MB
	MaxImages     = 5
	MinImages     = 1
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

type Storage struct {
	dir        string
	publicBase string
}

func New(dir, publicBase string) (*Storage, error) {
	if dir == "" {
		dir = "uploads"
	}
	for _, sub := range []string{"products", "birga"} {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			return nil, fmt.Errorf("upload papkasini yaratib bo'lmadi: %w", err)
		}
	}
	return &Storage{dir: dir, publicBase: strings.TrimRight(publicBase, "/")}, nil
}

func (s *Storage) Dir() string {
	return s.dir
}

func (s *Storage) PublicURL(relativePath string) string {
	relativePath = strings.TrimPrefix(filepath.ToSlash(relativePath), "/")
	if s.publicBase == "" {
		return "/" + relativePath
	}
	return s.publicBase + "/" + relativePath
}

// SaveProductImages yuklangan rasmlarni saqlaydi va public URL ro'yxatini qaytaradi.
// Rasmlar avtomatik 4:3 formatga moslashtiriladi.
func (s *Storage) SaveProductImages(files []*multipart.FileHeader) ([]string, error) {
	if len(files) < MinImages {
		return nil, fmt.Errorf("kamida %d ta rasm yuklash shart", MinImages)
	}
	if len(files) > MaxImages {
		return nil, fmt.Errorf("ko'pi bilan %d ta rasm yuklash mumkin", MaxImages)
	}

	urls := make([]string, 0, len(files))
	saved := make([]string, 0, len(files))

	cleanup := func() {
		for _, p := range saved {
			_ = os.Remove(p)
		}
	}

	for _, header := range files {
		if header.Size > MaxImageBytes {
			cleanup()
			return nil, fmt.Errorf("rasm hajmi 5 MB dan oshmasligi kerak: %s", header.Filename)
		}

		file, err := header.Open()
		if err != nil {
			cleanup()
			return nil, fmt.Errorf("rasmni ochib bo'lmadi: %w", err)
		}

		buf := make([]byte, 512)
		n, _ := file.Read(buf)
		contentType := http.DetectContentType(buf[:n])
		if !allowedImageTypes[contentType] {
			_ = file.Close()
			cleanup()
			return nil, fmt.Errorf("ruxsat etilmagan rasm turi: %s (faqat jpeg, png, webp, gif)", header.Filename)
		}

		if _, err := file.Seek(0, io.SeekStart); err != nil {
			_ = file.Close()
			cleanup()
			return nil, fmt.Errorf("rasmni o'qib bo'lmadi: %w", err)
		}

		normalized, err := imageutil.NormalizeProductImage(file)
		_ = file.Close()
		if err != nil {
			cleanup()
			return nil, err
		}

		relative := filepath.ToSlash(filepath.Join("products", uuid.NewString()+".jpg"))
		fullPath := filepath.Join(s.dir, filepath.FromSlash(relative))

		if err := os.WriteFile(fullPath, normalized, 0o644); err != nil {
			cleanup()
			return nil, fmt.Errorf("rasmni saqlab bo'lmadi: %w", err)
		}

		saved = append(saved, fullPath)
		urls = append(urls, s.PublicURL(relative))
	}

	return urls, nil
}

// SaveBirgaImage Bitta rasmni birga/ papkasiga saqlaydi (Birga Xarid mahsulotlari).
func (s *Storage) SaveBirgaImage(header *multipart.FileHeader) (string, error) {
	if header == nil {
		return "", fmt.Errorf("rasm yuklanmadi")
	}
	if header.Size > MaxImageBytes {
		return "", fmt.Errorf("rasm hajmi 5 MB dan oshmasligi kerak")
	}

	file, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("rasmni ochib bo'lmadi: %w", err)
	}

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if !allowedImageTypes[contentType] {
		_ = file.Close()
		return "", fmt.Errorf("ruxsat etilmagan rasm turi (faqat jpeg, png, webp, gif)")
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		_ = file.Close()
		return "", fmt.Errorf("rasmni o'qib bo'lmadi: %w", err)
	}

	normalized, err := imageutil.NormalizeProductImage(file)
	_ = file.Close()
	if err != nil {
		return "", err
	}

	relative := filepath.ToSlash(filepath.Join("birga", uuid.NewString()+".jpg"))
	fullPath := filepath.Join(s.dir, filepath.FromSlash(relative))
	if err := os.WriteFile(fullPath, normalized, 0o644); err != nil {
		return "", fmt.Errorf("rasmni saqlab bo'lmadi: %w", err)
	}
	return s.PublicURL(relative), nil
}

func (s *Storage) RemoveByURLs(urls []string) {
	prefix := s.publicBase + "/"
	for _, u := range urls {
		rel := strings.TrimPrefix(u, prefix)
		rel = strings.TrimPrefix(rel, "/")
		if rel == "" || strings.Contains(rel, "..") {
			continue
		}
		_ = os.Remove(filepath.Join(s.dir, filepath.FromSlash(rel)))
	}
}
