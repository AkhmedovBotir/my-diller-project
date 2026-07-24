import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, TriangleAlert } from 'lucide-react'
import type { Product } from '../../shared/types'

export function CartConflictModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <button aria-label="Yopish" onClick={onClose} className="absolute inset-0 cursor-default" />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl bg-white p-6 text-center shadow-2xl sm:rounded-3xl"
          >
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-500">
              <TriangleAlert size={24} />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">Savatni tozalash kerak</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Savatingizda boshqa ishlab chiqaruvchining mahsuloti bor. Bitta buyurtmada faqat bitta zavoddan
              mahsulot bo‘lishi mumkin. Savatni tozalab, <span className="font-semibold text-slate-700">{product.name}</span>{' '}
              mahsulotini qo‘shishni xohlaysizmi?
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={onClose}
                className="h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Bekor qilish
              </button>
              <button
                onClick={onConfirm}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
              >
                <ShoppingCart size={16} />
                Savatni tozalab qo‘shish
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
