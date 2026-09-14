'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, Truck, Check, AlertCircle, ExternalLink, Search, Loader2 } from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  price_at_time: number;
  selected_color: string | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  payment_method?: string;
  total_amount: number;
  awb_number?: string | null;
  shadowfax_status?: string | null;
  retail_order_items: OrderItem[];
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
      const res = await fetch(`/api/orders/track?order_id=${encodeURIComponent(id)}&email=${encodeURIComponent(mail)}`);
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
              placeholder="Order ID (e.g., ord_...)"
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
              className="bg-[#1d1d1f] text-white px-8 py-3 rounded-xl font-semibold hover:bg-black transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
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
            <div className="bg-[#f5f5f7] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Order Placed</div>
                <div className="text-sm font-semibold text-[#1d1d1f]">
                  {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Total</div>
                <div className="text-sm font-semibold text-[#1d1d1f]">₹{order.total_amount.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Status</div>
                <div className={`text-sm font-bold capitalize ${['paid', 'delivered', 'shipped', 'out_for_delivery'].includes(order.status) || (order.status === 'pending' && order.payment_method === 'cod') ? 'text-green-600' : ['failed', 'cancelled'].includes(order.status) ? 'text-red-500' : 'text-orange-500'}`}>
                  {order.status === 'paid' ? 'Processing' : order.status === 'out_for_delivery' ? 'Out for Delivery' : order.status === 'pending' ? (order.payment_method === 'cod' ? 'Order Confirmed' : 'Payment Pending') : order.status}
                </div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs text-[#86868b] font-medium uppercase tracking-wider mb-1">Order #</div>
                <div className="text-xs text-[#1d1d1f] font-bold">{order.id}</div>
                <div className="flex flex-col items-end gap-1 mt-1">
                  {order.awb_number && (
                    <a 
                      href={`https://shadowfax.in/tracking/${order.awb_number}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-blue-600 font-mono hover:underline flex items-center justify-end gap-1"
                    >
                      AWB: {order.awb_number}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  <a 
                    href={`/invoice/${order.id}?print=true`}
                    target="_blank"
                    className="text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors flex items-center justify-end gap-1"
                  >
                    Invoice
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>

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
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1d1d1f] mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {order.retail_order_items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#fbfbfd] p-4 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                        <Package size={20} className="text-[#86868b]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f]">{item.product_name}</p>
                        <p className="text-xs text-[#86868b] mt-0.5">
                          Qty: {item.quantity} {item.selected_color && `| Color: ${item.selected_color}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#1d1d1f]">
                      ₹{item.price_at_time.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfd] pt-32 pb-20 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>}>
      <main className="min-h-screen bg-[#fbfbfd] pt-32 pb-20 px-4 sm:px-6">
        <TrackOrderForm />
      </main>
    </Suspense>
  );
}
