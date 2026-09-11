import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  slug: string
  price: number
  quantity: number
  colorName?: string
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  isCartOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (productId: string, colorName?: string) => void
  updateQuantity: (productId: string, colorName: string | undefined, quantity: number) => void
  clearCart: () => void
  setIsCartOpen: (isOpen: boolean) => void
  getCartTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.productId === newItem.productId && item.colorName === newItem.colorName
          )

          if (existingItemIndex > -1) {
            const updatedItems = [...state.items]
            updatedItems[existingItemIndex].quantity += newItem.quantity || 1
            return { items: updatedItems }
          }

          return { items: [...state.items, { ...newItem, quantity: newItem.quantity || 1 }] }
        })
      },

      removeItem: (productId, colorName) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.colorName === colorName)
          )
        }))
      },

      updateQuantity: (productId, colorName, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.colorName === colorName
              ? { ...item, quantity }
              : item
          )
        }))
      },

      clearCart: () => set({ items: [] }),

      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0)
      }
    }),
    {
      name: 'aluxa-cart-storage',
    }
  )
)
