import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../../shared/types'

const CART_KEY = 'mydiller_xaridor_cart'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  totalAmount: number
  manufacturerId: number | null
  hasConflict: (product: Product) => boolean
  addItem: (product: Product, quantity: number) => void
  replaceCart: (product: Product, quantity: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadInitial(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && item.product && typeof item.quantity === 'number')
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const manufacturerId = items[0]?.product.ishlabchiqaruvchi_id ?? null

  const hasConflict = useCallback(
    (product: Product) => manufacturerId !== null && manufacturerId !== product.ishlabchiqaruvchi_id,
    [manufacturerId],
  )

  const addItem = useCallback((product: Product, quantity: number) => {
    setItems((current) => {
      const idx = current.findIndex((item) => item.product.id === product.id)
      if (idx >= 0) {
        const next = [...current]
        next[idx] = { product, quantity: next[idx].quantity + quantity }
        return next
      }
      return [...current, { product, quantity }]
    })
  }, [])

  const replaceCart = useCallback((product: Product, quantity: number) => {
    setItems([{ product, quantity }])
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((current) =>
      current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    )
  }, [])

  const removeItem = useCallback((productId: number) => {
    setItems((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0)

  const value = useMemo(
    () => ({
      items,
      itemCount,
      totalAmount,
      manufacturerId,
      hasConflict,
      addItem,
      replaceCart,
      updateQuantity,
      removeItem,
      clear,
    }),
    [items, itemCount, totalAmount, manufacturerId, hasConflict, addItem, replaceCart, updateQuantity, removeItem, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside CartProvider')
  return value
}
