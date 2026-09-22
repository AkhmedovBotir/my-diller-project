import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Snack = { id: number; message: string; tone?: 'ok' | 'err' }

let pushSnack: ((message: string, tone?: 'ok' | 'err') => void) | null = null

export function toast(message: string, tone: 'ok' | 'err' = 'ok') {
  pushSnack?.(message, tone)
}

export function SnackbarHost() {
  const [items, setItems] = useState<Snack[]>([])

  useEffect(() => {
    pushSnack = (message, tone = 'ok') => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }, 3200)
    }
    return () => {
      pushSnack = null
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[110] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              item.tone === 'err'
                ? 'bg-red-600 text-white'
                : 'bg-[#102d26] text-[#c9f560]'
            }`}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
