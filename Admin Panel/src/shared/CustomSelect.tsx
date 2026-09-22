import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  description?: string
}

type Props = {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  invalid?: boolean
  disabled?: boolean
  emptyText?: string
  name?: string
  required?: boolean
  className?: string
}

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Tanlang',
  searchPlaceholder = 'Qidirish...',
  invalid = false,
  disabled = false,
  emptyText = 'Variant topilmadi',
  name,
  required = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(needle),
    )
  }, [options, query])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 240)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 280 && rect.top > spaceBelow
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        zIndex: 80,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative block ${className}`}>
      {label ? <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span> : null}
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return
          setOpen((current) => !current)
        }}
        className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white px-3 text-left text-sm outline-none transition focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : open
              ? 'border-[#397461] bg-white ring-4 ring-[#397461]/8'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              style={menuStyle}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            >
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
                  />
                </div>
              </div>

              <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-slate-400">{emptyText}</li>
                ) : (
                  filtered.map((option) => {
                    const active = option.value === value
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            onChange(option.value)
                            setOpen(false)
                            setQuery('')
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            active ? 'bg-[#eff8f3] text-[#173c32]' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{option.label}</span>
                            {option.description ? (
                              <span className="mt-0.5 block truncate text-xs text-slate-400">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                          {active ? <Check size={16} className="mt-0.5 shrink-0 text-[#397461]" /> : null}
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
