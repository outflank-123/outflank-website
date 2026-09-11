'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/useCartStore'

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, getCartTotal } = useCartStore()
  const [mounted, setMounted] = useState(false)

  // Hydration fix for Zustand persist
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#1d1d1f]" />
                <h2 className="text-xl font-bold text-[#1d1d1f]">Your Cart</h2>
                <span className="bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {items.length}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <div className="w-20 h-20 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart size={32} className="text-[#aeaeb2]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1d1d1f] mb-2">Your cart is empty</h3>
                  <p className="text-[#86868b] text-sm max-w-[250px] mb-6">
                    Looks like you haven't added any items to your cart yet.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-2.5 rounded-full bg-[#1d1d1f] text-white font-semibold text-sm hover:bg-black transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.productId}-${item.colorName || 'default'}`} className="flex gap-4 p-3 rounded-2xl border border-black/5 bg-[#fbfbfd]">
                    {/* Item Image */}
                    <div className="w-20 h-20 rounded-xl bg-white border border-black/5 overflow-hidden relative shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f5f5f7]">
                          <ShoppingCart size={24} className="text-[#aeaeb2]" />
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-sm text-[#1d1d1f] line-clamp-2 leading-tight">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeItem(item.productId, item.colorName)}
                            className="text-[#aeaeb2] hover:text-[#e3231c] transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {item.colorName && (
                          <div className="text-xs text-[#86868b] mt-1 flex items-center gap-1">
                            Color: <span className="font-medium text-[#1d1d1f]">{item.colorName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Control */}
                        <div className="flex items-center bg-white rounded-full border border-black/10">
                          <button
                            onClick={() => updateQuantity(item.productId, item.colorName, Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 flex items-center justify-center text-[#1d1d1f] hover:text-[#e3231c]"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#1d1d1f]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.colorName, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#1d1d1f] hover:text-[#e3231c]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="font-bold text-[#1d1d1f]">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-5 border-t border-black/5 bg-[#fbfbfd]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#6e6e73] font-medium">Subtotal</span>
                  <span className="text-xl font-bold text-[#1d1d1f]">
                    ₹{getCartTotal().toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-[#86868b] mb-4 text-center">
                  Taxes and shipping calculated at checkout
                </p>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full flex items-center justify-center h-[52px] rounded-full bg-[#1d1d1f] text-white font-bold text-base shadow-lg hover:bg-black active:scale-[0.98] transition-all"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
