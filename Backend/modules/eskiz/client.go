package eskiz

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strings"
	"sync"
	"time"

	"diller-backend/internal/config"
)

type Client struct {
	cfg        config.EskizConfig
	httpClient *http.Client

	mu        sync.Mutex
	token     string
	tokenExp  time.Time
}

func NewClient(cfg config.EskizConfig) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (c *Client) configured() bool {
	return strings.TrimSpace(c.cfg.Email) != "" && strings.TrimSpace(c.cfg.Password) != ""
}

func (c *Client) Send(ctx context.Context, phone, message string) error {
	if !c.configured() {
		return ErrNotConfigured
	}

	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}

	if err := c.sendOnce(ctx, token, phone, message); err != nil {
		if err != errUnauthorized {
			return err
		}
		c.invalidateToken()
		token, err = c.getToken(ctx)
		if err != nil {
			return err
		}
		return c.sendOnce(ctx, token, phone, message)
	}
	return nil
}

var errUnauthorized = fmt.Errorf("eskiz: unauthorized")

func (c *Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	if c.token != "" && time.Now().Before(c.tokenExp) {
		token := c.token
		c.mu.Unlock()
		return token, nil
	}
	c.mu.Unlock()

	token, err := c.login(ctx)
	if err != nil {
		return "", err
	}

	c.mu.Lock()
	c.token = token
	c.tokenExp = time.Now().Add(25 * 24 * time.Hour)
	c.mu.Unlock()
	return token, nil
}

func (c *Client) invalidateToken() {
	c.mu.Lock()
	c.token = ""
	c.tokenExp = time.Time{}
	c.mu.Unlock()
}

func (c *Client) login(ctx context.Context) (string, error) {
	var body strings.Builder
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("email", c.cfg.Email)
	_ = writer.WriteField("password", c.cfg.Password)
	_ = writer.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.BaseURL+"/auth/login", strings.NewReader(body.String()))
	if err != nil {
		return "", fmt.Errorf("eskiz login so'rovini yaratib bo'lmadi: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("Eskiz login tarmoq xatosi", "xatolik", err)
		return "", ErrSendFailed
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		slog.Error("Eskiz login muvaffaqiyatsiz", "status", resp.StatusCode, "javob", truncate(raw))
		return "", ErrSendFailed
	}

	var parsed struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil || parsed.Data.Token == "" {
		slog.Error("Eskiz login javobi noto'g'ri", "javob", truncate(raw))
		return "", ErrSendFailed
	}
	return parsed.Data.Token, nil
}

func (c *Client) sendOnce(ctx context.Context, token, phone, message string) error {
	var body strings.Builder
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("mobile_phone", phone)
	_ = writer.WriteField("message", message)
	_ = writer.WriteField("from", c.cfg.From)
	_ = writer.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.BaseURL+"/message/sms/send", strings.NewReader(body.String()))
	if err != nil {
		return fmt.Errorf("eskiz SMS so'rovini yaratib bo'lmadi: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("Eskiz SMS tarmoq xatosi", "xatolik", err)
		return ErrSendFailed
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusUnauthorized {
		return errUnauthorized
	}
	if resp.StatusCode >= 400 {
		slog.Error("Eskiz SMS yuborilmadi", "status", resp.StatusCode, "javob", truncate(raw), "phone", MaskPhone(phone))
		return ErrSendFailed
	}
	return nil
}

func truncate(raw []byte) string {
	s := strings.TrimSpace(string(raw))
	if len(s) > 300 {
		return s[:300]
	}
	return s
}
