import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const LENGTH = 6

interface SmsCodeInputProps {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

export function SmsCodeInput({ value, onChange, disabled }: SmsCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const cleaned = value.replace(/\D/g, '').slice(0, LENGTH)
  const digits = Array.from({ length: LENGTH }, (_, i) => cleaned[i] ?? '')

  useEffect(() => {
    refs.current[Math.min(value.length, LENGTH - 1)]?.focus()
  }, [])

  function emit(next: string[]) {
    onChange(next.join('').replace(/\D/g, '').slice(0, LENGTH))
  }

  function handleChange(index: number, raw: string) {
    const digitsOnly = raw.replace(/\D/g, '')
    if (!digitsOnly) {
      const next = [...digits]
      next[index] = ''
      emit(next)
      return
    }
    if (digitsOnly.length > 1) {
      const merged = (digits.join('').slice(0, index) + digitsOnly).slice(0, LENGTH)
      onChange(merged)
      refs.current[Math.min(merged.length, LENGTH - 1)]?.focus()
      return
    }
    const next = [...digits]
    next[index] = digitsOnly
    emit(next)
    if (index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ''
      emit(next)
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    onChange(pasted)
    refs.current[Math.min(Math.max(pasted.length - 1, 0), LENGTH - 1)]?.focus()
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`${index + 1}-raqam`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-12 w-10 shrink-0 rounded-2xl border-2 border-[#102d26]/15 bg-white text-center text-lg font-bold text-[#102d26] outline-none transition focus:border-[#102d26] focus:ring-4 focus:ring-[#c9f560]/40 disabled:opacity-50 sm:h-14 sm:w-12 sm:text-xl"
        />
      ))}
    </div>
  )
}
