import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
}

type Props = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
}

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Tanlang',
  invalid = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLocaleLowerCase().includes(needle))
  }, [options, query])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    function update() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 220)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 260 && rect.top > spaceBelow
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        zIndex: 250,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onClick(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      const menu = document.getElementById(listId)
      if (menu?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open, listId])

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d5c52]">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-3 text-left text-sm transition ${
          invalid
            ? 'border-red-300'
            : open
              ? 'border-[#102d26] ring-2 ring-[#c9f560]/60'
              : 'border-[#102d26]/15'
        } disabled:opacity-50`}
      >
        <span className={selected ? 'text-[#102d26]' : 'text-slate-400'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#102d26]/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              id={listId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              style={menuStyle}
              className="overflow-hidden rounded-2xl border border-[#102d26]/10 bg-white shadow-xl shadow-[#102d26]/10"
            >
              <div className="flex items-center gap-2 border-b border-[#102d26]/8 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Qidirish..."
                  className="h-9 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-400">Topilmadi</p>
                ) : (
                  filtered.map((option) => {
                    const active = option.value === value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option.value)
                          setOpen(false)
                          setQuery('')
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm ${
                          active ? 'bg-[#c9f560]/35 text-[#102d26]' : 'hover:bg-[#f3f7f4]'
                        }`}
                      >
                        {option.label}
                        {active ? <Check className="h-4 w-4" /> : null}
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </label>
  )
}
