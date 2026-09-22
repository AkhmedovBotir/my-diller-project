//go:build windows

package console

import (
	"os"
	"syscall"
	"unsafe"
)

var (
	kernel32           = syscall.NewLazyDLL("kernel32.dll")
	procGetConsoleMode = kernel32.NewProc("GetConsoleMode")
	procSetConsoleMode = kernel32.NewProc("SetConsoleMode")
)

const enableVirtualTerminalProcessing = uint32(0x0004)

func EnableWindowsANSI() {
	for _, f := range []*os.File{os.Stdout, os.Stderr} {
		h := f.Fd()
		var mode uint32
		r1, _, _ := procGetConsoleMode.Call(h, uintptr(unsafe.Pointer(&mode)))
		if r1 == 0 {
			continue
		}
		mode |= enableVirtualTerminalProcessing
		_, _, _ = procSetConsoleMode.Call(h, uintptr(mode))
	}
}
