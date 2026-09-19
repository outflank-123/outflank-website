'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ShoppingMode = 'retail' | 'bulk'

interface ShoppingModeState {
  mode: ShoppingMode
  setMode: (mode: ShoppingMode) => void
  toggleMode: () => void
}

export const useShoppingModeStore = create<ShoppingModeState>()(
  persist(
    (set) => ({
      mode: 'retail', // Default to Retail Mode
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'retail' ? 'bulk' : 'retail' })),
    }),
    {
      name: 'outflank_shopping_mode',
    }
  )
)
