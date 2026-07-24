import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type SnackbarType = 'success' | 'error' | 'info'

interface SnackbarState {
  id: number
  message: string
  type: SnackbarType
}

interface SnackbarContextValue {
  showSnackbar: (message: string, type?: SnackbarType) => void
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

const styles: Record<SnackbarType, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-[#173c32] text-white' },
  error: { icon: AlertCircle, className: 'bg-red-600 text-white' },
  info: { icon: Info, className: 'bg-slate-800 text-white' },
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const timerRef = useRef<number | null>(null)

  const close = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setSnackbar(null)
  }, [])

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'success') => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setSnackbar({ id: Date.now(), message, type })
    timerRef.current = window.setTimeout(() => setSnackbar(null), 4000)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar])
  const config = snackbar ? styles[snackbar.type] : null
  const Icon = config?.icon

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end sm:top-6">
        <AnimatePresence mode="wait">
          {snackbar && config && Icon && (
            <motion.div
              key={snackbar.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3.5 shadow-2xl ${config.className}`}
              role="status"
              aria-live="polite"
            >
              <Icon className="mt-0.5 shrink-0" size={19} />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{snackbar.message}</p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
                aria-label="Xabarni yopish"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SnackbarContext.Provider>
  )
}

// Provider va hook bitta UI modulida saqlanadi.
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbar() {
  const context = useContext(SnackbarContext)
  if (!context) throw new Error('useSnackbar must be used inside SnackbarProvider')
  return context
}
