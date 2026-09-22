package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type Config struct {
	AppEnv        string         `json:"app_env"`
	HTTPPort      string         `json:"http_port"`
	Database      DatabaseConfig `json:"database"`
	BirgaDatabase DatabaseConfig `json:"birga_database"`
	JWT           JWTConfig      `json:"jwt"`
	CORS          CORSConfig     `json:"cors"`
	Upload        UploadConfig   `json:"upload"`
	Eskiz         EskizConfig    `json:"eskiz"`
}

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Name     string `json:"name"`
	SSLMode  string `json:"sslmode"`
}

type JWTConfig struct {
	Secret   string `json:"secret"`
	TTLHours int    `json:"ttl_hours"`
}

type CORSConfig struct {
	AllowedOrigins   []string `json:"allowed_origins"`
	AllowedMethods   []string `json:"allowed_methods"`
	AllowedHeaders   []string `json:"allowed_headers"`
	AllowCredentials bool     `json:"allow_credentials"`
	MaxAge           int      `json:"max_age"`
}

type UploadConfig struct {
	Dir           string `json:"dir"`
	PublicBaseURL string `json:"public_base_url"`
}

type EskizConfig struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	From     string `json:"from"`
	BaseURL  string `json:"base_url"`
}

func (c *Config) DatabaseDSN() string {
	return c.Database.DSN()
}

func (c *Config) BirgaDatabaseDSN() string {
	return c.BirgaDatabase.DSN()
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		d.User, d.Password,
		d.Host, d.Port,
		d.Name, d.SSLMode,
	)
}

// SystemDSN postgres tizim bazasiga (CREATE DATABASE uchun) ulanish.
func (d DatabaseConfig) SystemDSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/postgres?sslmode=%s",
		d.User, d.Password,
		d.Host, d.Port,
		d.SSLMode,
	)
}

func (c *Config) JWTTTL() time.Duration {
	hours := c.JWT.TTLHours
	if hours <= 0 {
		hours = 24
	}
	return time.Duration(hours) * time.Hour
}

// Load config.json ni o'qiydi.
// CONFIG_PATH env orqali boshqa fayl ko'rsatish mumkin.
func Load() (*Config, error) {
	path := os.Getenv("CONFIG_PATH")
	if path == "" {
		path = "config.json"
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("%s sozlama faylini o'qib bo'lmadi: %w", path, err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("%s sozlama faylidagi JSON noto'g'ri: %w", path, err)
	}

	cfg.applyDefaults()
	return &cfg, nil
}

func (c *Config) applyDefaults() {
	if c.AppEnv == "" {
		c.AppEnv = "development"
	}
	if c.HTTPPort == "" {
		c.HTTPPort = "8080"
	}
	if c.Database.Host == "" {
		c.Database.Host = "localhost"
	}
	if c.Database.Port == "" {
		c.Database.Port = "5432"
	}
	if c.Database.SSLMode == "" {
		c.Database.SSLMode = "disable"
	}
	if c.BirgaDatabase.Host == "" {
		c.BirgaDatabase.Host = c.Database.Host
	}
	if c.BirgaDatabase.Port == "" {
		c.BirgaDatabase.Port = c.Database.Port
	}
	if c.BirgaDatabase.User == "" {
		c.BirgaDatabase.User = c.Database.User
	}
	if c.BirgaDatabase.Password == "" {
		c.BirgaDatabase.Password = c.Database.Password
	}
	if c.BirgaDatabase.Name == "" {
		c.BirgaDatabase.Name = "birga_xarid"
	}
	if c.BirgaDatabase.SSLMode == "" {
		c.BirgaDatabase.SSLMode = c.Database.SSLMode
		if c.BirgaDatabase.SSLMode == "" {
			c.BirgaDatabase.SSLMode = "disable"
		}
	}
	if c.JWT.Secret == "" {
		c.JWT.Secret = "change-me-in-production"
	}
	if c.JWT.TTLHours <= 0 {
		c.JWT.TTLHours = 24
	}
	if len(c.CORS.AllowedOrigins) == 0 {
		c.CORS.AllowedOrigins = []string{"http://localhost:5173"}
	}
	if len(c.CORS.AllowedMethods) == 0 {
		c.CORS.AllowedMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	}
	if len(c.CORS.AllowedHeaders) == 0 {
		c.CORS.AllowedHeaders = []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"}
	}
	if c.CORS.MaxAge <= 0 {
		c.CORS.MaxAge = 300
	}
	if c.Upload.Dir == "" {
		c.Upload.Dir = "uploads"
	}
	if c.Upload.PublicBaseURL == "" {
		c.Upload.PublicBaseURL = "http://localhost:" + c.HTTPPort + "/uploads"
	}
	if c.Eskiz.BaseURL == "" {
		c.Eskiz.BaseURL = "https://notify.eskiz.uz/api"
	}
	if c.Eskiz.From == "" {
		c.Eskiz.From = "4546"
	}
}
