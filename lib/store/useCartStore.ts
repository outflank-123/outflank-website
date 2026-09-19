import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CustomBrandingData {
  isCustomized: boolean
  brandText?: string
  textColor?: string
  logoUrl?: string
  logoStoragePath?: string
  fileSizeBytes?: number
  fileSizeKb?: string
  printPosition?: string
  customizationLabel?: string
  coordinates?: {
    left: string
    top: string
    width: string
  }
}

export interface CartItem {
  productId: string
  name: string
  slug: string
  price: number
  quantity: number
  colorName?: string
  imageUrl?: string
  customization?: string
  customBranding?: CustomBrandingData
}

function getCustomBrandingKey(item: { productId: string; colorName?: string; customBranding?: CustomBrandingData; customization?: string }): string {
  const brandKey = item.customBranding 
    ? `${item.customBranding.brandText || ''}:${item.customBranding.textColor || ''}:${item.customBranding.logoStoragePath || item.customBranding.logoUrl || ''}`
    : item.customization || 'plain'
  return `${item.productId}-${item.colorName || 'default'}-${brandKey}`
}

interface CartState {
  items: CartItem[]
  isCartOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (productId: string, colorName?: string, customBranding?: CustomBrandingData) => void
  updateQuantity: (productId: string, colorName: string | undefined, quantity: number, customBranding?: CustomBrandingData) => void
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
          const newKey = getCustomBrandingKey(newItem)
          const existingItemIndex = state.items.findIndex(
            (item) => getCustomBrandingKey(item) === newKey
          )

          if (existingItemIndex > -1) {
            const updatedItems = [...state.items]
            updatedItems[existingItemIndex].quantity += newItem.quantity || 1
            return { items: updatedItems }
          }

          return { items: [...state.items, { ...newItem, quantity: newItem.quantity || 1 }] }
        })
      },

      removeItem: (productId, colorName, customBranding) => {
        set((state) => {
          const targetKey = getCustomBrandingKey({ productId, colorName, customBranding })
          return {
            items: state.items.filter((item) => getCustomBrandingKey(item) !== targetKey)
          }
        })
      },

      updateQuantity: (productId, colorName, quantity, customBranding) => {
        set((state) => {
          const targetKey = getCustomBrandingKey({ productId, colorName, customBranding })
          return {
            items: state.items.map((item) =>
              getCustomBrandingKey(item) === targetKey
                ? { ...item, quantity }
                : item
            )
          }
        })
      },

      clearCart: () => set({ items: [] }),

      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0)
      }
    }),
    {
      name: 'outflank-cart-storage',
    }
  )
)
