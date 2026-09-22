import { useEffect, useId, useState } from 'react'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function localPhoneDigits(raw: string) {
  let digits = onlyDigits(raw)
  if (digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)
  else if (digits.length === 11 && digits.startsWith('8')) digits = digits.slice(1)
  return digits.slice(0, 9)
}

export function formatLocalPhone(raw: string) {
  const digits = localPhoneDigits(raw)
  const chunks = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
  return chunks.filter((chunk) => chunk.length > 0).join(' ')
}

export function toFullPhone(raw: string) {
  const digits = localPhoneDigits(raw)
  return digits ? `+998${digits}` : ''
}

interface PhoneInputProps {
  name?: string
  label?: string
  defaultValue?: string
  required?: boolean
  invalid?: boolean
  className?: string
  size?: 'sm' | 'md'
  labelStyle?: 'form' | 'auth'
}

export function PhoneInput({
  name = 'phone',
  label = 'Telefon raqami',
  defaultValue = '',
  required = true,
  invalid = false,
  className = '',
  size = 'md',
  labelStyle = 'form',
}: PhoneInputProps) {
  const inputId = useId()
  const [local, setLocal] = useState(() => formatLocalPhone(defaultValue))

  useEffect(() => {
    setLocal(formatLocalPhone(defaultValue))
  }, [defaultValue])

  const full = toFullPhone(local)
  const height = size === 'sm' ? 'h-11' : 'h-12'
  const labelClass =
    labelStyle === 'auth'
      ? 'mb-2 block text-sm font-semibold text-slate-700'
      : 'mb-2 block text-xs font-bold text-slate-600'

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      ) : null}
      <label
        htmlFor={inputId}
        className={`flex overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 ${height} ${
          invalid
            ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
            : 'border-slate-200 focus-within:border-[#397461] focus-within:ring-[#397461]/10'
        }`}
      >
        <span className="flex shrink-0 select-none items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-600">
          +998
        </span>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="90 123 45 67"
          value={local}
          required={required}
          minLength={required ? 12 : undefined}
          maxLength={12}
          pattern={required ? '\\d{2} \\d{3} \\d{2} \\d{2}' : undefined}
          title="90 123 45 67"
          onChange={(event) => setLocal(formatLocalPhone(event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm tracking-wide text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>
      <input type="hidden" name={name} value={full} />
    </div>
  )
}
