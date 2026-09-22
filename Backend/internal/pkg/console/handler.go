package console

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"sync"
	"time"
)

const (
	reset  = "\033[0m"
	dim    = "\033[2m"
	bold   = "\033[1m"
	red    = "\033[31m"
	green  = "\033[32m"
	yellow = "\033[33m"
	blue   = "\033[34m"
	magenta = "\033[35m"
	cyan   = "\033[36m"
	white  = "\033[37m"
)

// PrettyHandler development uchun rangli, o'qishga qulay slog handler.
type PrettyHandler struct {
	opts   slog.HandlerOptions
	mu     sync.Mutex
	out    io.Writer
	attrs  []slog.Attr
	groups []string
}

func NewPrettyHandler(w io.Writer, opts *slog.HandlerOptions) *PrettyHandler {
	if w == nil {
		w = os.Stdout
	}
	h := &PrettyHandler{out: w}
	if opts != nil {
		h.opts = *opts
	}
	if h.opts.Level == nil {
		h.opts.Level = slog.LevelInfo
	}
	return h
}

func (h *PrettyHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.opts.Level.Level()
}

func (h *PrettyHandler) Handle(_ context.Context, r slog.Record) error {
	level := r.Level
	if h.opts.ReplaceAttr != nil {
		a := h.opts.ReplaceAttr(nil, slog.Any(slog.LevelKey, level))
		if a.Key == "" {
			return nil
		}
	}

	buf := make([]byte, 0, 256)
	ts := r.Time
	if ts.IsZero() {
		ts = time.Now()
	}
	buf = append(buf, dim...)
	buf = append(buf, ts.Format("15:04:05")...)
	buf = append(buf, reset...)
	buf = append(buf, ' ', ' ')

	lvlColor, lvlLabel := levelStyle(level)
	buf = append(buf, lvlColor...)
	buf = append(buf, bold...)
	buf = append(buf, lvlLabel...)
	buf = append(buf, reset...)
	buf = append(buf, ' ', ' ')

	buf = append(buf, r.Message...)

	attrs := make([]slog.Attr, 0, len(h.attrs)+8)
	attrs = append(attrs, h.attrs...)
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, a)
		return true
	})

	for _, a := range attrs {
		if h.opts.ReplaceAttr != nil {
			a = h.opts.ReplaceAttr(h.groups, a)
			if a.Key == "" {
				continue
			}
		}
		if a.Key == slog.TimeKey || a.Key == slog.LevelKey || a.Key == slog.MessageKey {
			continue
		}
		buf = append(buf, ' ', ' ')
		buf = append(buf, dim...)
		buf = append(buf, a.Key...)
		buf = append(buf, '=')
		buf = append(buf, reset...)
		buf = append(buf, cyan...)
		buf = fmt.Append(buf, a.Value.Any())
		buf = append(buf, reset...)
	}

	buf = append(buf, '\n')

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := h.out.Write(buf)
	return err
}

func (h *PrettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	cloned := *h
	cloned.attrs = append(append([]slog.Attr{}, h.attrs...), attrs...)
	return &cloned
}

func (h *PrettyHandler) WithGroup(name string) slog.Handler {
	cloned := *h
	cloned.groups = append(append([]string{}, h.groups...), name)
	return &cloned
}

func levelStyle(level slog.Level) (color, label string) {
	switch {
	case level >= slog.LevelError:
		return red, "ERROR"
	case level >= slog.LevelWarn:
		return yellow, "WARN "
	case level >= slog.LevelInfo:
		return green, "INFO "
	default:
		return blue, "DEBUG"
	}
}
