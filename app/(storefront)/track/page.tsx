'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Package, Truck, Check, AlertCircle, ExternalLink, Search, Loader2, ChevronLeft, Sparkles, FileText, ShieldCheck } from 'lucide-react';

interface CustomDetail {
  isCustomized: boolean;
  brandType: 'text' | 'logo';
  brandText?: string | null;
  textColor?: string | null;
  fontFamily?: string | null;
  logoUrl?: string | null;
  printPosition?: string | null;
  coordinates?: { top?: string | number; left?: string | number; width?: string | number } | null;
  customizationLabel?: string | null;
}

interface OrderItem {
  id?: string;
  product_name: string;
  quantity: number;
  price_at_time: number;
  selected_color: string | null;
  customization?: any;
  products?: {
    primary_image_url?: string;
  } | Array<{ primary_image_url?: string }>;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  payment_method?: string;
  total_amount: number;
  shipping_fee?: number;
  awb_number?: string | null;
  shadowfax_status?: string | null;
  customer_email?: string;
  customer_name?: string;
  notes?: string | null;
  has_custom_items?: boolean;
  retail_order_items: OrderItem[];
}

function extractTrackCustomData(item: OrderItem, order: Order): CustomDetail | null {
  let c = item.customization;
  if (!c && order.notes) {
    try {
      const parsed = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
      const found = parsed?.custom_items?.find((ci: any) => ci.product_name === item.product_name);
      if (found?.customization) c = found.customization;
    } catch {}
  }
  if (!c && item.selected_color && item.selected_color.includes('Custom')) {
    const match = item.selected_color.match(/Custom:?\s*"?([^"\]]+)"?/i);
    if (match) {
      return {
        isCustomized: true,
        brandType: 'text',
        brandText: match[1],
        printPosition: 'Left Chest',
        textColor: '#FFFFFF',
      };
    }
  }
  if (!c || (!c.isCustomized && !c.is_customized && !c.brandText && !c.brand_text && !c.logoUrl && !c.logo_url)) {
    return null;
  }

  const brandText = c.brandText || c.brand_text || c.text || null;
  const logoUrl = c.logoUrl || c.logo_url || null;
  const brandType: 'text' | 'logo' = c.brandType || (logoUrl ? 'logo' : 'text');
  const textColor = c.textColor || c.text_color || '#FFFFFF';
  const fontFamily = c.fontFamily || c.font_family || 'Standard Sans';

  let printPos = c.printPosition || c.print_position || 'Left Chest';
  if (printPos === 'center_chest') printPos = 'Center Chest';
  if (printPos === 'left_chest') printPos = 'Left Chest';
  if (printPos === 'right_chest') printPos = 'Right Chest';

  const coords = c.coordinates || c.position || null;

  return {
    isCustomized: true,
    brandType,
    brandText,
    textColor,
    fontFamily,
    logoUrl,
    printPosition: printPos,
    coordinates: coords,
    customizationLabel: c.customizationLabel || c.customization_label || null,
  };
}

function TrackOrderForm() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('order_id') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  // Auto-search if both parameters are provided in the URL
  useEffect(() => {
    const urlOrderId = searchParams.get('order_id');
    const urlEmail = searchParams.get('email');
    if (urlOrderId && urlEmail) {
      performTrack(urlOrderId, urlEmail);
    }
  }, [searchParams]);

  const performTrack = async (id: string, mail: string) => {
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/track?order_id=${encodeURIComponent(id.trim())}&email=${encodeURIComponent(mail.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        const err = await res.json();
        setError(err.error || 'Order not found. Please check your details and try again.');
      }
    } catch (err) {
      setError('An error occurred while tracking your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !email) {
      setError('Please enter both Order ID and Email Address.');
      return;
    }
    performTrack(orderId, email);
  };

  const hasAnyCustom = order?.retail_order_items?.some(item => Boolean(extractTrackCustomData(item, order)));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Track Your Order</h1>
        <p className="text-[#86868b] mt-2">Enter your Order ID and Email Address to see real-time tracking.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-black/5 mb-8">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Order ID (e.g., 1fd0fc53-...)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#1d1d1f] text-white px-8 py-3 rounded-xl font-semibold hover:bg-black transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            Track
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </div>

      {order && (
        <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Order Header */}
          <div className="bg-[#f5f5f7] px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-black/5">
            <div>
              <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Order Placed</div>
              <div className="text-sm font-semibold text-[#1d1d1f]">
                {new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Total Amount</div>
              <div className="text-sm font-bold text-[#1d1d1f]">₹{order.total_amount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Status</div>
              <div className={`text-sm font-bold capitalize ${['paid', 'delivered', 'shipped', 'out_for_delivery'].includes(order.status) || (order.status === 'pending' && order.payment_method === 'cod') ? 'text-green-600' : ['failed', 'cancelled'].includes(order.status) ? 'text-red-500' : 'text-orange-500'}`}>
                {order.status === 'paid' ? 'Processing / In Production' : order.status === 'out_for_delivery' ? 'Out for Delivery' : order.status === 'pending' ? (order.payment_method === 'cod' ? 'Order Confirmed' : 'Payment Pending') : order.status}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs text-[#86868b] font-medium uppercase tracking-wider">Order Reference</span>
              <span className="font-mono text-xs font-bold text-[#1d1d1f]">#{order.id.slice(0, 8).toUpperCase()}</span>
              
              <div className="flex items-center gap-2 mt-1">
                {order.awb_number && (
                  <a 
                    href={`https://shadowfax.in/tracking/${order.awb_number}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Truck size={12} /> AWB: {order.awb_number}
                    <ExternalLink size={10} />
                  </a>
                )}
                <a 
                  href={`/invoice/${order.id}?print=true`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-50 hover:text-black transition-colors shadow-2xs"
                >
                  <FileText size={12} />
                  View Tax Invoice
                </a>
              </div>
            </div>
          </div>

          {/* Custom Order Assurance Banner */}
          {hasAnyCustom && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white px-6 py-3 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue-600 shrink-0" />
                <span className="font-semibold">Contains Custom Personalized Items — Handcrafted to Your Exact Design</span>
              </div>
              <span className="text-[11px] text-blue-600/80 font-medium hidden sm:inline">Production Specifications Verified</span>
            </div>
          )}

          {/* Tracking Timeline */}
          {['failed', 'cancelled'].includes(order.status) ? (
            <div className="bg-red-50/50 px-6 py-4 border-b border-black/5 flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <div>
                <p className="text-sm font-semibold text-red-600">Order {order.status === 'failed' ? 'Payment Failed' : 'Cancelled'}</p>
                <p className="text-xs text-red-500 mt-0.5">Please contact support if you need assistance.</p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 border-b border-black/5">
              <div className="relative max-w-2xl mx-auto">
                {/* Track line */}
                <div className="absolute left-0 top-4 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full"></div>
                <div
                  className="absolute left-0 top-4 -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-500"
                  style={{
                    width: order.status === 'delivered' ? '100%'
                      : order.status === 'out_for_delivery' ? '75%'
                      : ['shipped'].includes(order.status) ? '40%'
                      : '0%'
                  }}
                ></div>

                <div className="relative flex justify-between">
                  {/* Step 1: Placed */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white border-4 border-white shadow-sm relative z-10">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <p className="text-xs font-semibold mt-2 text-[#1d1d1f]">Placed</p>
                  </div>

                  {/* Step 2: Shipped */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative z-10 transition-colors ${
                      ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Truck size={14} />
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${
                      ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                    }`}>Shipped</p>
                  </div>

                  {/* Step 3: Out for Delivery */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative z-10 transition-colors ${
                      ['out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Package size={14} />
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${
                      ['out_for_delivery', 'delivered'].includes(order.status) ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                    }`}>Out for Delivery</p>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative z-10 transition-colors ${
                      order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${
                      order.status === 'delivered' ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                    }`}>Delivered</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#1d1d1f]">Items in This Order</h3>
              <span className="text-xs text-[#86868b]">{order.retail_order_items?.length} item{order.retail_order_items?.length === 1 ? '' : 's'}</span>
            </div>

            <div className="space-y-4">
              {order.retail_order_items?.map((item, idx) => {
                const custom = extractTrackCustomData(item, order);
                const prodImg = (Array.isArray(item.products) ? item.products[0] : item.products)?.primary_image_url;

                return (
                  <div key={item.id || idx} className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        {prodImg ? (
                          <div className="w-14 h-14 rounded-xl bg-white border border-black/5 overflow-hidden shrink-0 relative">
                            <img src={prodImg} alt={item.product_name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                            <Package size={22} className="text-[#86868b]" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-[#1d1d1f]">{item.product_name}</p>
                          <p className="text-xs text-[#86868b] mt-1">
                            Qty: <strong className="text-gray-900">{item.quantity}</strong> {item.selected_color && <>· Color: <strong className="text-gray-900">{item.selected_color}</strong></>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-[#1d1d1f]">
                          ₹{(item.price_at_time * item.quantity).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-[#86868b] mt-0.5">
                          ₹{item.price_at_time.toLocaleString('en-IN')} each
                        </div>
                      </div>
                    </div>

                    {/* ── Customization Specifications Card ── */}
                    {custom && (
                      <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                            <Sparkles size={12} className="text-blue-600" />
                            Personalized Custom Branding
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            Placement: <strong className="text-gray-900">{custom.printPosition}</strong>
                          </span>
                        </div>

                        {/* Custom Text */}
                        {custom.brandType === 'text' && custom.brandText && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] px-2.5 py-1 rounded-lg border border-black/5 text-xs">
                              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Text:</span>
                              <span className="font-mono font-bold text-[#1d1d1f] text-sm">"{custom.brandText}"</span>
                            </div>

                            {custom.textColor && (
                              <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] px-2 py-1 rounded-lg border border-black/5 text-xs">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Ink:</span>
                                <span 
                                  className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0 shadow-2xs" 
                                  style={{ backgroundColor: custom.textColor }}
                                  title={custom.textColor}
                                />
                                <span className="font-mono text-[11px] font-semibold text-gray-800">{custom.textColor}</span>
                              </div>
                            )}

                            {custom.coordinates && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                (Coord: Top {custom.coordinates.top}, Left {custom.coordinates.left})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Custom Logo */}
                        {custom.brandType === 'logo' && (
                          <div className="flex items-center gap-3 pt-0.5">
                            {custom.logoUrl && (
                              <div className="w-12 h-12 rounded-lg bg-[#f8f9fa] border border-gray-200 p-1 flex items-center justify-center shrink-0">
                                <img src={custom.logoUrl} alt="Attached Custom Logo" className="max-w-full max-h-full object-contain" />
                              </div>
                            )}
                            <div className="text-xs">
                              <p className="font-semibold text-gray-900">Custom Uploaded Logo Graphic</p>
                              <p className="text-[11px] text-emerald-600 font-medium">✓ High-resolution raster/vector asset attached</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quality Note */}
            <div className="mt-6 pt-5 border-t border-black/5 flex items-center gap-2.5 text-xs text-[#86868b]">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Personalized items are produced with high-precision heat seal/screen transfer based on your saved specifications.</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  const router = useRouter();
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfd] pt-32 pb-20 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>}>
      <main className="min-h-screen bg-[#fbfbfd] pt-32 pb-20 px-4 sm:px-6 relative">
        <button 
          onClick={() => router.back()} 
          className="absolute top-24 left-4 sm:left-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d1d1f] bg-white border border-black/10 hover:border-black/30 hover:bg-[#f5f5f7] shadow-sm hover:shadow transition-all duration-300 rounded-full px-5 py-2 cursor-pointer group"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <TrackOrderForm />
      </main>
    </Suspense>
  );
}
