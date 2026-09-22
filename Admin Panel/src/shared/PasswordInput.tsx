import { useState, type ChangeEvent } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

interface PasswordInputProps {
  name?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  value?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  invalid?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  labelStyle?: 'form' | 'auth'
  withLock?: boolean
  autoComplete?: string
}

export function PasswordInput({
  name = 'password',
  label = 'Parol',
  placeholder = 'Kamida 6 ta belgi',
  defaultValue,
  value,
  onChange,
  required = true,
  invalid = false,
  className = '',
  size = 'md',
  labelStyle = 'form',
  withLock = false,
  autoComplete = 'new-password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const height = size === 'sm' ? 'h-11' : size === 'lg' ? 'h-13' : 'h-12'
  const radius = size === 'lg' ? 'rounded-2xl' : 'rounded-xl'
  const labelClass =
    labelStyle === 'auth'
      ? 'mb-2 block text-sm font-semibold text-slate-700'
      : 'mb-2 block text-xs font-bold text-slate-600'

  return (
    <div className={className}>
      {label ? <span className={labelClass}>{label}</span> : null}
      <div className="relative">
        {withLock ? (
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        ) : null}
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={6}
          autoComplete={autoComplete}
          placeholder={placeholder}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange}
          className={`w-full border bg-white pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${height} ${radius} ${
            withLock ? 'pl-11' : 'pl-4'
          } ${
            invalid
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/10'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
