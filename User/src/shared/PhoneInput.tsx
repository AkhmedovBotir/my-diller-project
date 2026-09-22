import { useEffect, useId, useState } from 'react'
import { formatLocalPhone, localPhoneDigits, normalizePhone } from './phone'

type Props = {
  value?: string
  onChange?: (fullPhone: string, localDigits: string) => void
  label?: string
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

export function PhoneInput({
  value = '',
  onChange,
  label = 'Telefon raqami',
  invalid = false,
  disabled = false,
  autoFocus = false,
}: Props) {
  const id = useId()
  const [local, setLocal] = useState(() => formatLocalPhone(value))

  useEffect(() => {
    setLocal(formatLocalPhone(value))
  }, [value])

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d5c52]">
        {label}
      </span>
      <div
        className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition ${
          invalid
            ? 'border-red-300 ring-2 ring-red-100'
            : 'border-[#102d26]/15 focus-within:border-[#102d26] focus-within:ring-2 focus-within:ring-[#c9f560]/60'
        }`}
      >
        <span className="border-r border-[#102d26]/10 px-3 text-sm font-semibold text-[#102d26]">
          +998
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoFocus={autoFocus}
          disabled={disabled}
          value={local}
          placeholder="90 123 45 67"
          onChange={(event) => {
            const next = formatLocalPhone(event.target.value)
            setLocal(next)
            const digits = localPhoneDigits(next)
            onChange?.(normalizePhone(next), digits)
          }}
          className="h-full w-full bg-transparent px-3 text-sm text-[#102d26] outline-none placeholder:text-slate-300"
        />
      </div>
    </label>
  )
}
