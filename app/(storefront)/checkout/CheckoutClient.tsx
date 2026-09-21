'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { ChevronLeft, Lock, Loader2, CheckCircle2, Wallet, CreditCard, FileText } from 'lucide-react'
import { useCartStore } from '@/lib/store/useCartStore'
import { useAuth } from '@/lib/AuthContext'
import { State, City } from 'country-state-city'
import { getBrowserCache, setBrowserCache, removeBrowserCache } from '@/lib/browserCache'

interface StoreSettings {
  is_cod_enabled: boolean;
  cod_min_amount: number;
  free_shipping_threshold: number;
  flat_shipping_rate: number;
}

export default function CheckoutClient() {
  const router = useRouter()
  const { items, getCartTotal, clearCart } = useCartStore()
  const { user, customerProfile, saveAddress, openAuthModal } = useAuth()
  const [isAddressPreFilled, setIsAddressPreFilled] = useState(false)
  
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    houseNo: '',
    street: '',
    landmark: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
  })

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')

  const states = State.getStatesOfCountry('IN')
  const cities = formData.stateCode ? City.getCitiesOfState('IN', formData.stateCode) : []

  // Calculate pricing & COD availability unconditionally at the top level
  const subtotal = getCartTotal()
  
  let shippingFee = 0
  if (settings) {
    if (subtotal < settings.free_shipping_threshold) {
      shippingFee = settings.flat_shipping_rate
    }
  }

  const total = subtotal + shippingFee
  const isCodAvailable = Boolean(settings?.is_cod_enabled && subtotal >= (settings?.cod_min_amount || 0))
  const isGoogleUser = Boolean(user && (customerProfile?.auth_provider === 'google' || user?.providerData?.some(p => p.providerId === 'google.com')))

  useEffect(() => {
    setMounted(true)
    fetchSettings()
  }, [])

  // Reset payment method if COD becomes unavailable (unconditionally at the top level)
  useEffect(() => {
    if (!isCodAvailable && paymentMethod === 'cod') {
      setPaymentMethod('razorpay')
    }
  }, [isCodAvailable, paymentMethod])

  // Auto-fill address and customer contact info if customer is logged in
  useEffect(() => {
    if (customerProfile?.shipping_address) {
      const addr = customerProfile.shipping_address as any
      const matchedState = states.find(
        (s) =>
          s.name.toLowerCase() === (addr.state || '').toLowerCase() ||
          s.isoCode.toLowerCase() === (addr.state || '').toLowerCase()
      )

      const houseNo = addr.houseNo || ''
      const street = addr.street || (!addr.houseNo && addr.address ? addr.address : '')
      const landmark = addr.landmark || addr.addressLine2 || ''
      const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : ''
      const combinedAddress = addr.address || [houseNo, street, landmarkText].filter(Boolean).join(', ')

      setFormData((prev) => ({
        ...prev,
        name: addr.fullName || customerProfile.full_name || user?.displayName || prev.name,
        email: addr.email || customerProfile.email || user?.email || prev.email,
        phone: addr.phone || customerProfile.phone || user?.phoneNumber?.replace(/\D/g, '').slice(-10) || prev.phone,
        houseNo: houseNo || prev.houseNo,
        street: street || prev.street,
        landmark: landmark || prev.landmark,
        address: combinedAddress || prev.address,
        city: addr.city || prev.city,
        state: matchedState?.name || addr.state || prev.state,
        stateCode: matchedState?.isoCode || prev.stateCode,
        pincode: addr.pincode || prev.pincode,
      }))
      setIsAddressPreFilled(true)
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        name: customerProfile?.full_name || user.displayName || prev.name,
        email: customerProfile?.email || user.email || prev.email,
        phone: customerProfile?.phone || user.phoneNumber?.replace(/\D/g, '').slice(-10) || prev.phone,
      }))
    }
  }, [customerProfile, user])

  const fetchSettings = async () => {
    // Check browser session cache first
    const cached = getBrowserCache<StoreSettings>('outflank_store_settings', 15 * 60 * 1000, 'session')
    if (cached?.data) {
      setSettings(cached.data)
      if (!cached.isStale) return // Fresh cache: eliminate API call!
    }

    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setBrowserCache('outflank_store_settings', data, 'session')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Early returns ONLY AFTER all React hooks have been declared
  if (!mounted) return null

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] pt-28 pb-12 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold text-[#1d1d1f] mb-4">Your Cart is Empty</h1>
        <p className="text-[#86868b] mb-8">Add some items to your cart before proceeding to checkout.</p>
        <Link href="/products" className="px-8 py-3 rounded-full bg-[#1d1d1f] text-white font-semibold hover:bg-black transition-colors">
          Browse Products
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] pt-28 pb-12 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-bold text-[#1d1d1f] mb-4">Order Confirmed!</h1>
        <p className="text-[#86868b] mb-2">Thank you for your purchase.</p>
        <p className="text-[#86868b] mb-8">We have sent a confirmation to your email.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/account" className="px-8 py-3 rounded-full bg-[#1d1d1f] text-white font-semibold hover:bg-black transition-colors">
            Track My Order
          </Link>
          {successOrderId && (
            <Link 
              href={`/invoice/${successOrderId}?print=true`} 
              target="_blank"
              className="px-8 py-3 rounded-full border border-black/10 bg-white text-[#1d1d1f] font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Download Invoice
            </Link>
          )}
          <Link href="/products" className="px-8 py-3 rounded-full border border-black/10 bg-white text-[#1d1d1f] font-semibold hover:bg-gray-50 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStateCode = e.target.value
    const selectedState = states.find(s => s.isoCode === selectedStateCode)
    
    setFormData({
      ...formData,
      stateCode: selectedStateCode,
      state: selectedState?.name || '',
      city: '', // reset city when state changes
    })
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Strict Client-Side Validation
    if (!formData.name.trim()) {
      alert("Please enter your full name.")
      return
    }

    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.")
      return
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      alert("Please enter a valid email address.")
      return
    }

    if (!formData.houseNo.trim() && !formData.address.trim()) {
      alert("Please enter your Flat / House No. / Building Name.")
      return
    }

    if (!formData.street.trim() && !formData.address.trim()) {
      alert("Please enter your Street / Area / Sector.")
      return
    }

    if (!formData.state.trim()) {
      alert("Please select your State.")
      return
    }

    if (!formData.city.trim()) {
      alert("Please select your City.")
      return
    }

    const pincodeRegex = /^[0-9]{6}$/
    if (!pincodeRegex.test(formData.pincode.trim())) {
      alert("Please enter a valid 6-digit PIN code.")
      return
    }

    setLoading(true)

    const houseNo = formData.houseNo.trim()
    const street = formData.street.trim()
    const landmark = formData.landmark.trim()
    const combinedStreet = [houseNo, street].filter(Boolean).join(', ')
    const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : ''
    const fullAddress = [combinedStreet, landmarkText].filter(Boolean).join(', ') || formData.address.trim()

    const customerPayload = {
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: cleanPhone,
      houseNo,
      street,
      landmark,
      addressLine1: combinedStreet || fullAddress,
      addressLine2: landmark,
      address: fullAddress,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    }

    // Save/update address immediately for logged-in user so it is securely remembered
    if (user?.uid) {
      saveAddress({
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: cleanPhone,
        houseNo,
        street,
        landmark,
        addressLine1: combinedStreet || fullAddress,
        addressLine2: landmark,
        address: fullAddress,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      }).catch(() => {})
    }

    try {
      if (paymentMethod === 'cod') {
        // Handle COD Flow
        const res = await fetch('/api/checkout/cod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            customer: customerPayload,
            totalAmount: total,
            shippingFee,
            firebaseUid: user?.uid
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to place order')
        
        clearCart()
        setSuccessOrderId(data.orderId)
        setSuccess(true)
        setLoading(false)
        if (user?.uid) {
          removeBrowserCache('outflank_orders_' + user.uid, 'session')
        }

        if (user?.uid) {
          saveAddress({
            fullName: formData.name,
            email: formData.email,
            phone: formData.phone,
            houseNo,
            street,
            landmark,
            addressLine1: combinedStreet || fullAddress,
            addressLine2: landmark,
            address: fullAddress,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          }).catch(() => {})
        }
        return
      }

      // Handle Razorpay Flow
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer: customerPayload,
          totalAmount: total,
          shippingFee,
          firebaseUid: user?.uid
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate payment')
      }


      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: data.amount,
        currency: data.currency,
        name: 'Outflank',
        description: 'Retail Order Payment',
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              internal_order_id: data.internalOrderId,
            }),
          })
          
          const verifyData = await verifyRes.json()
          
          if (verifyRes.ok && verifyData.success) {
            clearCart()
            setSuccessOrderId(data.internalOrderId)
            setSuccess(true)
            if (user?.uid) {
              removeBrowserCache('outflank_orders_' + user.uid, 'session')
            }

            if (user?.uid) {
              saveAddress({
                fullName: formData.name,
                email: formData.email,
                phone: formData.phone,
                houseNo,
                street,
                landmark,
                addressLine1: combinedStreet || fullAddress,
                addressLine2: landmark,
                address: fullAddress,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
              }).catch(() => {})
            }
          } else {
            alert('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#e3231c',
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }]
              },
              other: {
                name: "Other Payment Modes",
                instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: {
              show_default_blocks: true
            }
          }
        }
      }

      // @ts-ignore
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        alert(response.error.description)
      })
      rzp.open()
      
    } catch (error: any) {
      console.error('Payment Error:', error)
      alert(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <main className="min-h-screen bg-[#fbfbfd] pt-24 pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/products" className="inline-flex items-center text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] transition-colors group">
              <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
              Return to Catalog
            </Link>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#34c759]">
              <Lock size={14} />
              Secure Checkout
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ── Left Column: Checkout Form ── */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-black/5">
              <h2 className="text-2xl font-bold text-[#1d1d1f] mb-6">Contact & Delivery</h2>
              
              <form id="checkout-form" onSubmit={handlePayment} className="space-y-5">
                {/* User Pre-fill / Sign-in Banner */}
                {user ? (
                  isAddressPreFilled && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200/70 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        Welcome back! Your delivery address has been auto-filled from your Outflank account.
                      </span>
                    </div>
                  )
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1d1d1f]">Have an Outflank account?</span>
                      <span className="hidden sm:inline text-slate-500">Sign in with WhatsApp or Google for saved addresses.</span>
                    </div>
                    <button
                      type="button"
                      onClick={openAuthModal}
                      className="px-3.5 py-1.5 bg-[#1d1d1f] hover:bg-black text-white font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wider mb-2">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Full Name</label>
                      <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Phone Number</label>
                      <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm" placeholder="+91 99999 99999" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-[#86868b]">Email Address (For Order Updates) *</label>
                        {isGoogleUser && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/80">
                            <Lock size={10} className="text-slate-400" />
                            <span>Google Account</span>
                          </span>
                        )}
                      </div>
                      <input
                        required
                        name="email"
                        value={formData.email}
                        readOnly={isGoogleUser}
                        onChange={handleInputChange}
                        type="email"
                        className={`w-full h-11 px-4 rounded-xl border text-sm outline-none transition-all ${
                          isGoogleUser
                            ? 'bg-slate-100/80 border-black/5 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-[#fbfbfd] border-black/10 text-[#1d1d1f] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c]'
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-black/5 my-6" />

                {/* Shipping Address */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wider mb-2">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Flat / House No., Building Name *</label>
                      <input
                        required
                        name="houseNo"
                        value={formData.houseNo}
                        onChange={handleInputChange}
                        type="text"
                        className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm"
                        placeholder="e.g. Flat 402, Building 3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Street, Road, Area, Sector *</label>
                      <input
                        required
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        type="text"
                        className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm"
                        placeholder="e.g. 5th Main, Sector 14"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Landmark (Optional / Near By)</label>
                    <input
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleInputChange}
                      type="text"
                      className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm"
                      placeholder="e.g. Opposite Metro Station, Near Apollo Hospital"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">State</label>
                      <select required name="stateCode" value={formData.stateCode} onChange={handleStateChange} className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm appearance-none">
                        <option value="">Select State</option>
                        {states.map(state => (
                          <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">City</label>
                      <select required name="city" value={formData.city} onChange={handleInputChange} disabled={!formData.stateCode} className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm appearance-none disabled:opacity-50">
                        <option value="">Select City</option>
                        {formData.city && !cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase()) && (
                          <option value={formData.city}>{formData.city}</option>
                        )}
                        {cities.map(city => (
                          <option key={city.name} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-[#86868b] mb-1.5">PIN Code</label>
                      <input
                        required
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        type="text"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        title="Enter a valid 6-digit PIN code"
                        className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] focus:bg-white focus:border-[#e3231c] focus:ring-1 focus:ring-[#e3231c] outline-none transition-all text-sm"
                        placeholder="110001"
                      />
                    </div>

                    {user ? (
                      <div className="md:col-span-3 flex items-center gap-2 pt-1 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-3.5 py-2.5 rounded-xl font-medium">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>Address is linked to your Outflank account and automatically saved for future 1-click orders.</span>
                      </div>
                    ) : (
                      <div className="md:col-span-3 flex items-center justify-between gap-2 pt-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                        <span>Save this address to your account for future orders:</span>
                        <button
                          type="button"
                          onClick={openAuthModal}
                          className="text-[#e3231c] font-bold hover:underline cursor-pointer shrink-0"
                        >
                          Sign In / Register
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-black/5 my-6" />

                {/* Payment Method */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wider mb-2">Payment Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Razorpay Option */}
                    <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'razorpay' ? 'border-[#e3231c] bg-red-50' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="hidden" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'razorpay' ? 'border-[#e3231c]' : 'border-gray-300'}`}>
                        {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 rounded-full bg-[#e3231c]"></div>}
                      </div>
                      <CreditCard className="text-gray-500" size={20} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#1d1d1f]">Pay Online</div>
                        <div className="text-xs text-[#86868b]">UPI, Cards, Netbanking</div>
                      </div>
                    </label>

                    {/* COD Option */}
                    <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isCodAvailable ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : paymentMethod === 'cod' ? 'border-[#e3231c] bg-red-50 cursor-pointer' : 'border-black/10 hover:border-black/20 cursor-pointer'}`}>
                      <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => isCodAvailable && setPaymentMethod('cod')} disabled={!isCodAvailable} className="hidden" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-[#e3231c]' : 'border-gray-300'}`}>
                        {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#e3231c]"></div>}
                      </div>
                      <Wallet className="text-gray-500" size={20} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#1d1d1f]">Cash on Delivery</div>
                        <div className="text-xs text-[#86868b]">
                          {!settings?.is_cod_enabled 
                            ? 'Currently disabled' 
                            : subtotal < (settings?.cod_min_amount || 0) 
                              ? `Min order ₹${settings?.cod_min_amount}` 
                              : 'Pay when delivered'}
                        </div>
                      </div>
                    </label>

                  </div>
                </div>

              </form>
            </div>

            {/* ── Right Column: Order Summary ── */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
              
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 sticky top-28">
                <h2 className="text-xl font-bold text-[#1d1d1f] mb-6">Order Summary</h2>
                
                {/* Items List */}
                <div className="flex flex-col gap-4 mb-6 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
                  {items.map((item, idx) => (
                    <div key={`${item.productId}-${item.colorName || 'default'}-${idx}`} className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl bg-[#f5f5f7] border border-black/5 overflow-hidden relative shrink-0">
                        {item.imageUrl && (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        )}
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1d1d1f] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white z-10">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-xs text-[#1d1d1f] line-clamp-2">{item.name}</h4>
                        {item.colorName && <div className="text-[10px] text-[#86868b] mt-0.5">{item.colorName}</div>}
                      </div>
                      <div className="font-bold text-sm text-[#1d1d1f]">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-black/5 mb-6" />

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6e6e73]">Subtotal</span>
                    <span className="font-semibold text-[#1d1d1f]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6e6e73]">Shipping</span>
                    {shippingFee === 0 ? (
                      <span className="font-semibold text-[#34c759]">Free</span>
                    ) : (
                      <span className="font-semibold text-[#1d1d1f]">₹{shippingFee.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-black/5">
                    <span className="font-bold text-base text-[#1d1d1f]">Total</span>
                    <span className="font-bold text-2xl text-[#1d1d1f]">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || !settings}
                  className="w-full flex items-center justify-center gap-2 h-[52px] rounded-full bg-[#e3231c] text-white font-bold text-base shadow-[0_4px_14px_rgba(227,35,28,0.25)] hover:bg-[#c91d17] hover:shadow-[0_6px_20px_rgba(227,35,28,0.35)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'razorpay' ? (
                    <>Pay Securely (₹{total.toLocaleString('en-IN')})</>
                  ) : (
                    <>Place COD Order (₹{total.toLocaleString('en-IN')})</>
                  )}
                </button>
                <div className="text-center mt-3 text-[10px] text-[#86868b] flex items-center justify-center gap-1">
                  <Lock size={10} />
                  {paymentMethod === 'razorpay' ? 'Payments are processed securely via Razorpay' : 'Pay when your order is delivered'}
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </>
  )
}
