"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Package, Clock, ChevronRight, Bell, BellRing, Check, Truck, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useFCM } from '@/hooks/useFCM';

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
  total_amount: number;
  retail_order_items: OrderItem[];
}

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { permission, requestPermission } = useFCM();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isRequestingNotification, setIsRequestingNotification] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?uid=${user?.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleEnableNotifications = async () => {
    setIsRequestingNotification(true);
    await requestPermission();
    setIsRequestingNotification(false);
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center bg-[#fbfbfd]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d1d1f]"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbfd] pt-24 pb-20">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">My Account</h1>
            <p className="text-[#86868b] mt-2">
              Logged in as <span className="font-medium text-[#1d1d1f]">{user?.phoneNumber || user?.email}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm font-semibold text-[#e3231c] hover:text-[#c91d17] transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Notifications Card */}
        {permission !== 'granted' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-black/5 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <BellRing size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f]">Never miss an update</h3>
                <p className="text-sm text-[#86868b] mt-1">Get instant push notifications when your order status changes.</p>
              </div>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={isRequestingNotification || permission === 'denied'}
              className="w-full md:w-auto px-6 py-3 bg-[#1d1d1f] text-white rounded-full font-medium hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isRequestingNotification ? 'Enabling...' : permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-black/5">
          <h2 className="text-xl font-bold text-[#1d1d1f] mb-6 flex items-center gap-2">
            <Package className="text-[#86868b]" />
            Order History
          </h2>

          {fetching ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#86868b]"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-[#f5f5f7] rounded-2xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Package size={24} className="text-[#86868b]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No orders yet</h3>
              <p className="text-[#86868b] text-sm">When you place an order, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-black/5 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  
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
                      <div className={`text-sm font-bold capitalize ${['paid', 'delivered', 'shipped'].includes(order.status) ? 'text-green-600' : ['failed', 'cancelled'].includes(order.status) ? 'text-red-500' : 'text-orange-500'}`}>
                        {order.status === 'paid' ? 'Processing' : order.status}
                      </div>
                    </div>
                    <div className="flex-1 text-right text-xs text-[#86868b]">
                      Order #{order.id.split('-')[0].toUpperCase()}
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
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full"></div>
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-500"
                          style={{ 
                            width: order.status === 'delivered' ? '100%' : 
                                   order.status === 'shipped' ? '50%' : '0%' 
                          }}
                        ></div>

                        <div className="relative flex justify-between">
                          {/* Step 1: Placed */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white border-4 border-white shadow-sm relative z-10">
                              <Check size={14} strokeWidth={3} />
                            </div>
                            <p className="text-xs font-semibold mt-2 text-[#1d1d1f]">Order Placed</p>
                          </div>

                          {/* Step 2: Shipped */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative z-10 transition-colors ${['shipped', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              <Truck size={14} strokeWidth={['shipped', 'delivered'].includes(order.status) ? 3 : 2} />
                            </div>
                            <p className={`text-xs font-semibold mt-2 ${['shipped', 'delivered'].includes(order.status) ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>Shipped</p>
                          </div>

                          {/* Step 3: Delivered */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative z-10 transition-colors ${order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              <Package size={14} strokeWidth={order.status === 'delivered' ? 3 : 2} />
                            </div>
                            <p className={`text-xs font-semibold mt-2 ${order.status === 'delivered' ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>Delivered</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {order.retail_order_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#f5f5f7] rounded-lg flex items-center justify-center">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
