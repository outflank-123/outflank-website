"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, Package, Clock, ChevronRight, ChevronLeft, ArrowLeft, BellRing, Check, Truck, 
  AlertCircle, ExternalLink, Paintbrush, MapPin, Edit3, Save, 
  MessageSquare, User, Building2, Mail, Phone, Calendar, ShieldCheck,
  CheckCircle2, Sparkles, Plus, X, Lock
} from 'lucide-react';
import { State, City } from 'country-state-city';
import { useAuth } from '@/lib/AuthContext';
import { useFCM } from '@/hooks/useFCM';
import { getBrowserCache, setBrowserCache } from '@/lib/browserCache';

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
  awb_number?: string | null;
  shadowfax_status?: string | null;
  notes?: string | null;
  has_custom_items?: boolean;
  retail_order_items: OrderItem[];
}

function extractAccountCustomData(item: OrderItem, order: Order) {
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
        brandType: 'text' as const,
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
    logoUrl,
    printPosition: printPos,
    coordinates: coords,
  };
}

export default function AccountPage() {
  const { user, loading, customerProfile, updateProfile, saveAddress, signOutCustomer } = useAuth();
  const router = useRouter();
  const { permission, requestPermission } = useFCM();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isRequestingNotification, setIsRequestingNotification] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: '',
    companyName: '',
    gstin: '',
  });

  // Address Edit State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState('');
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    houseNo: '',
    street: '',
    landmark: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    tag: 'Home' as 'Home' | 'Office' | 'Other',
  });

  // Quick Phone Edit State
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');
  const [savingQuickPhone, setSavingQuickPhone] = useState(false);

  const states = State.getStatesOfCountry('IN');
  const cities = addressForm.stateCode ? City.getCitiesOfState('IN', addressForm.stateCode) : [];

  const currentPhone = customerProfile?.phone || user?.phoneNumber?.replace(/\D/g, '').slice(-10) || '';
  const authProvider = customerProfile?.auth_provider || (user?.providerData?.some(p => p.providerId === 'google.com') ? 'google' : (user?.phoneNumber ? 'whatsapp' : 'google'));
  const isGoogleUser = authProvider === 'google' || Boolean(user?.providerData?.some((p) => p.providerId === 'google.com')) || Boolean(user?.email && !user?.phoneNumber);

  const handleSaveQuickPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return;
    setSavingQuickPhone(true);
    const ok = await updateProfile({ phone: clean });
    setSavingQuickPhone(false);
    if (ok) {
      setIsAddingPhone(false);
      setProfileSuccessMsg('Mobile number updated successfully.');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    }
  };

  // Populate profile form
  useEffect(() => {
    if (user || customerProfile) {
      setProfileForm({
        fullName: customerProfile?.full_name || user?.displayName || '',
        phone: customerProfile?.phone || user?.phoneNumber?.replace(/\D/g, '').slice(-10) || '',
        email: customerProfile?.email || user?.email || '',
        gender: (customerProfile as any)?.gender || customerProfile?.shipping_address?.gender || '',
        companyName: customerProfile?.company_name || customerProfile?.shipping_address?.companyName || '',
        gstin: customerProfile?.gstin || customerProfile?.shipping_address?.gstin || '',
      });
    }
  }, [customerProfile, user]);

  // Populate address form
  useEffect(() => {
    if (customerProfile?.shipping_address) {
      const a = customerProfile.shipping_address as any;
      const matchedState = states.find(
        (s) =>
          s.name.toLowerCase() === (a.state || '').toLowerCase() ||
          s.isoCode.toLowerCase() === (a.state || '').toLowerCase()
      );

      const houseNo = a.houseNo || '';
      const street = a.street || (!a.houseNo && a.address ? a.address : '');
      const landmark = a.landmark || a.addressLine2 || '';
      const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : '';
      const combinedAddress = a.address || [houseNo, street, landmarkText].filter(Boolean).join(', ');

      setAddressForm({
        fullName: a.fullName || customerProfile.full_name || user?.displayName || '',
        phone: a.phone || customerProfile.phone || user?.phoneNumber?.replace(/\D/g, '').slice(-10) || '',
        email: a.email || customerProfile.email || user?.email || '',
        houseNo,
        street,
        landmark,
        address: combinedAddress,
        city: a.city || '',
        state: matchedState?.name || a.state || '',
        stateCode: matchedState?.isoCode || '',
        pincode: a.pincode || '',
        tag: a.tag || 'Home',
      });
    } else if (user) {
      setAddressForm((prev) => ({
        ...prev,
        fullName: customerProfile?.full_name || user.displayName || prev.fullName,
        phone: customerProfile?.phone || user.phoneNumber?.replace(/\D/g, '').slice(-10) || prev.phone,
        email: customerProfile?.email || user.email || prev.email,
      }));
    }
  }, [customerProfile, user]);

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

  const fetchOrders = async (force = false) => {
    if (!user?.uid) return;
    const cacheKey = `outflank_orders_${user.uid}`;

    // Check browser session cache first
    const cached = getBrowserCache<Order[]>(cacheKey, 2 * 60 * 1000, 'session');
    if (cached?.data) {
      setOrders(cached.data);
      setFetching(false);
      if (!cached.isStale && !force) {
        return; // Fresh cache: skip API call completely!
      }
    }

    try {
      const res = await fetch(`/api/orders?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        setBrowserCache(cacheKey, data, 'session');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleSignOut = async () => {
    await signOutCustomer();
    router.push('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg('');

    const ok = await updateProfile({
      fullName: profileForm.fullName.trim() || undefined,
      phone: profileForm.phone.replace(/\D/g, '').slice(-10) || undefined,
      email: isGoogleUser ? (customerProfile?.email || user?.email || undefined) : (profileForm.email.trim() || undefined),
      gender: profileForm.gender || undefined,
      companyName: profileForm.companyName.trim() || undefined,
      gstin: profileForm.gstin.trim().toUpperCase() || undefined,
    });

    setSavingProfile(false);
    if (ok) {
      setIsEditingProfile(false);
      setProfileSuccessMsg('Profile details updated successfully.');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressSuccessMsg('');

    const houseNo = addressForm.houseNo.trim();
    const street = addressForm.street.trim();
    const landmark = addressForm.landmark.trim();
    const combinedStreet = [houseNo, street].filter(Boolean).join(', ');
    const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : '';
    const fullAddress = [combinedStreet, landmarkText].filter(Boolean).join(', ');

    const ok = await saveAddress({
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.replace(/\D/g, '').slice(-10),
      email: addressForm.email.trim(),
      houseNo,
      street,
      landmark: landmark || undefined,
      addressLine1: combinedStreet,
      addressLine2: landmark || undefined,
      address: fullAddress || addressForm.address.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.replace(/\D/g, '').slice(0, 6),
      tag: addressForm.tag,
    });

    setSavingAddress(false);
    if (ok) {
      setIsEditingAddress(false);
      setAddressSuccessMsg('Delivery address saved successfully. It will auto-fill at checkout.');
      setTimeout(() => setAddressSuccessMsg(''), 4000);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const selectedObj = states.find((s) => s.isoCode === selectedIso);
    setAddressForm({
      ...addressForm,
      stateCode: selectedIso,
      state: selectedObj?.name || '',
      city: '',
    });
  };

  const handleEnableNotifications = async () => {
    setIsRequestingNotification(true);
    await requestPermission();
    setIsRequestingNotification(false);
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen pt-36 pb-20 flex items-center justify-center bg-[#fbfbfd]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d1d1f]"></div>
      </div>
    );
  }

  const userInitials = (customerProfile?.full_name || user?.displayName || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase();
  const activeOrdersCount = orders.filter((o) =>
    ['paid', 'shipped', 'out_for_delivery'].includes(o.status)
  ).length;

  return (
    <main className="min-h-screen bg-[#fbfbfd] pt-36 sm:pt-40 pb-24 font-sans">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 space-y-6 sm:space-y-8">
        
        {/* ── TOP BACK NAVIGATION BAR ── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/products');
              }
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#1d1d1f] transition-all group cursor-pointer bg-white px-4 py-2.5 rounded-2xl border border-black/5 shadow-2xs hover:shadow-xs hover:border-black/10"
          >
            <ChevronLeft size={16} className="text-slate-400 group-hover:text-[#1d1d1f] group-hover:-translate-x-0.5 transition-all" />
            <span>Back</span>
          </button>

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#e3231c] transition-colors"
          >
            <span>Continue Shopping</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* ── 1. HERO PROFILE OVERVIEW CARD ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-black/5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* User Avatar & Greetings */}
            <div className="flex items-center gap-4 sm:gap-5">
              {user?.photoURL ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0">
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1d1d1f] to-slate-800 text-white flex items-center justify-center text-xl sm:text-2xl font-black tracking-wider shadow-md shrink-0">
                  {userInitials}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] tracking-tight">
                    {customerProfile?.full_name || user?.displayName || 'Welcome Back'}
                  </h1>

                  {/* Auth Provider Badge */}
                  {authProvider === 'whatsapp' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#128C7E] bg-[#25D366]/10 px-2.5 py-0.5 rounded-full border border-[#25D366]/30">
                      <MessageSquare size={11} /> WhatsApp Verified
                    </span>
                  ) : authProvider === 'apple' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Apple Account
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Google Account
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[#86868b] mt-1 font-medium flex flex-wrap items-center gap-3">
                  <span>{user?.email || customerProfile?.email || 'No email provided'}</span>
                  {currentPhone ? (
                    <>
                      <span>•</span>
                      <span>+91 {currentPhone}</span>
                    </>
                  ) : (
                    <>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingPhone(true);
                          setTimeout(() => {
                            const el = document.getElementById('account-phone-input');
                            if (el) el.focus();
                          }, 50);
                        }}
                        className="text-[#e3231c] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Mobile Number</span>
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions & Sign Out */}
            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <Link
                href="/products"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Browse Catalog
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-[#e3231c] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-100">
            <div className="bg-[#fbfbfd] p-3.5 sm:p-4 rounded-2xl border border-black/5 text-center">
              <div className="text-xl sm:text-2xl font-black text-[#1d1d1f]">{orders.length}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Orders</div>
            </div>
            <div className="bg-[#fbfbfd] p-3.5 sm:p-4 rounded-2xl border border-black/5 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-600">{activeOrdersCount}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">In Transit</div>
            </div>
            <div className="bg-[#fbfbfd] p-3.5 sm:p-4 rounded-2xl border border-black/5 text-center">
              <div className="text-xl sm:text-2xl font-black text-[#1d1d1f]">
                {customerProfile?.shipping_address ? '1' : '0'}
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Saved Addresses</div>
            </div>
          </div>
        </div>

        {/* ── 2. PERSONAL INFORMATION / CUSTOMER DETAILS ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1d1d1f] flex items-center gap-2">
                <User className="text-[#1d1d1f]" size={20} />
                Personal Information
              </h2>
              <p className="text-xs text-[#86868b] mt-1">
                Your personal and corporate identity used for orders and custom invoices.
              </p>
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#e3231c] hover:underline cursor-pointer"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {profileSuccessMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1d1d1f]"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Mobile Number (WhatsApp) *</label>
                  <div className="flex h-11 rounded-xl border border-black/10 bg-[#fbfbfd] overflow-hidden focus-within:border-[#1d1d1f] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1d1d1f]/10 transition-all">
                    <span className="inline-flex items-center px-3 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="flex-1 px-3 text-sm font-medium outline-none bg-transparent"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#86868b]">Email Address *</label>
                    {isGoogleUser && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/80">
                        <Lock size={10} className="text-slate-400" />
                        <span>Google Account</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    readOnly={isGoogleUser}
                    disabled={isGoogleUser}
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-medium transition-all ${
                      isGoogleUser
                        ? 'bg-slate-100/80 border-black/5 text-slate-500 cursor-not-allowed select-none'
                        : 'bg-[#fbfbfd] border-black/10 text-[#1d1d1f] focus:bg-white focus:outline-none focus:border-[#1d1d1f]'
                    }`}
                    placeholder="name@example.com"
                  />
                  {isGoogleUser && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Email address is linked to your Google login and cannot be modified.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1d1d1f]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Company / Organization (Optional)</label>
                  <input
                    type="text"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1d1d1f]"
                    placeholder="e.g. Zeecrown Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">GSTIN for B2B Invoice (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={profileForm.gstin}
                    onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1d1d1f]"
                    placeholder="15-digit GSTIN number"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Save size={14} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <User size={12} />
                  <span>Full Name</span>
                </div>
                <div className="text-sm font-bold text-[#1d1d1f]">
                  {customerProfile?.full_name || user?.displayName || 'Not provided'}
                </div>
              </div>

              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <Mail size={12} />
                  <span>Email Address</span>
                </div>
                <div className="text-sm font-bold text-[#1d1d1f] truncate">
                  {customerProfile?.email || user?.email || 'Not provided'}
                </div>
              </div>

              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <Phone size={12} />
                    <span>Mobile Phone</span>
                  </div>
                  {currentPhone && !isAddingPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickPhone(currentPhone);
                        setIsAddingPhone(true);
                      }}
                      className="text-xs text-[#e3231c] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={11} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {currentPhone && !isAddingPhone ? (
                  <div className="pt-0.5">
                    <div className="text-sm font-bold text-[#1d1d1f] flex items-center justify-between">
                      <span>+91 {currentPhone}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200/80">
                        WhatsApp Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Used for order tracking & fast checkout</p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveQuickPhone} className="space-y-2 pt-0.5">
                    <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs focus-within:border-[#1d1d1f] focus-within:ring-2 focus-within:ring-[#1d1d1f]/10 transition-all">
                      <span className="inline-flex items-center px-2.5 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 select-none">
                        +91
                      </span>
                      <input
                        id="account-phone-input"
                        type="tel"
                        autoFocus={isAddingPhone}
                        required
                        value={quickPhone}
                        onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="flex-1 px-3 py-2 text-xs font-semibold text-[#1d1d1f] outline-none bg-transparent placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={savingQuickPhone || quickPhone.replace(/\D/g, '').slice(-10).length !== 10}
                        className="px-3.5 py-1.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed m-1 rounded-lg shrink-0 cursor-pointer"
                      >
                        {savingQuickPhone ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Link for WhatsApp delivery updates</span>
                      {currentPhone && isAddingPhone && (
                        <button
                          type="button"
                          onClick={() => setIsAddingPhone(false)}
                          className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <Calendar size={12} />
                  <span>Gender</span>
                </div>
                <div className="text-sm font-semibold text-[#1d1d1f]">
                  {(customerProfile as any)?.gender || customerProfile?.shipping_address?.gender || 'Not specified'}
                </div>
              </div>

              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <Building2 size={12} />
                  <span>Company / Organization</span>
                </div>
                <div className="text-sm font-semibold text-[#1d1d1f]">
                  {customerProfile?.company_name || customerProfile?.shipping_address?.companyName || 'Personal Account'}
                </div>
              </div>

              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={12} />
                  <span>GSTIN for Tax Credit</span>
                </div>
                <div className="text-sm font-semibold text-[#1d1d1f]">
                  {customerProfile?.gstin || customerProfile?.shipping_address?.gstin || 'No GSTIN attached'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. SAVED DELIVERY ADDRESS ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1d1d1f] flex items-center gap-2">
                <MapPin className="text-[#e3231c]" size={20} />
                Saved Delivery Address
              </h2>
              <p className="text-xs text-[#86868b] mt-1">
                Used for instant 1-click checkout. You won't need to enter address details again.
              </p>
            </div>
            {!isEditingAddress && (
              <button
                type="button"
                onClick={() => setIsEditingAddress(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#e3231c] hover:underline cursor-pointer"
              >
                <Edit3 size={14} />
                <span>{customerProfile?.shipping_address ? 'Edit Address' : 'Add Address'}</span>
              </button>
            )}
          </div>

          {addressSuccessMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{addressSuccessMsg}</span>
            </div>
          )}

          {isEditingAddress ? (
            <form onSubmit={handleSaveAddress} className="space-y-4 pt-1">
              
              {/* Address Tag Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Address Label</label>
                <div className="flex items-center gap-2">
                  {(['Home', 'Office', 'Other'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, tag })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        addressForm.tag === tag
                          ? 'bg-[#1d1d1f] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                    placeholder="Recipient Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Recipient Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Flat / House No., Building Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.houseNo}
                    onChange={(e) => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                    placeholder="e.g. Flat 402, Building 3, Sunshine Heights"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">Street, Road, Area, Sector *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                    placeholder="e.g. 5th Main, Near Central Market, Sector 14"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1.5">
                  Landmark (Optional / Nearby Point for Delivery Boy)
                </label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                  placeholder="e.g. Opposite Metro Station, Behind City Hospital"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">State *</label>
                  <select
                    required
                    value={addressForm.stateCode}
                    onChange={handleStateChange}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">City *</label>
                  <select
                    required
                    disabled={!addressForm.stateCode}
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c] disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {addressForm.city && !cities.some((c) => c.name.toLowerCase() === addressForm.city.toLowerCase()) && (
                      <option value={addressForm.city}>{addressForm.city}</option>
                    )}
                    {cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#86868b] mb-1.5">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[#fbfbfd] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#e3231c]"
                    placeholder="110001"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2.5 bg-[#1d1d1f] hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Save size={14} />
                  <span>{savingAddress ? 'Saving Address...' : 'Save Address'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : customerProfile?.shipping_address ? (
            <div className="bg-[#f5f5f7] p-5 sm:p-6 rounded-2xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white border border-black/5 text-slate-800">
                    {customerProfile.shipping_address.tag || 'Home'}
                  </span>
                  <span className="text-sm font-extrabold text-[#1d1d1f]">
                    {customerProfile.shipping_address.fullName || customerProfile.full_name || 'Primary Recipient'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {customerProfile.shipping_address.houseNo || customerProfile.shipping_address.street ? (
                    <>
                      <p className="text-xs text-slate-800 font-semibold leading-relaxed max-w-lg">
                        {[customerProfile.shipping_address.houseNo, customerProfile.shipping_address.street].filter(Boolean).join(', ')}
                      </p>
                      {customerProfile.shipping_address.landmark && (
                        <p className="text-xs text-slate-500 font-medium">
                          Landmark: {customerProfile.shipping_address.landmark}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                      {customerProfile.shipping_address.address}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-bold">
                  {customerProfile.shipping_address.city}, {customerProfile.shipping_address.state} - {customerProfile.shipping_address.pincode}
                </p>
                <p className="text-xs text-slate-500">
                  Contact Phone: <strong className="text-slate-800">+91 {customerProfile.shipping_address.phone || customerProfile.phone}</strong>
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/80 font-bold self-start md:self-auto">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Default Address (Auto-Fills at Checkout)</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#f5f5f7] rounded-2xl border border-dashed border-gray-300 space-y-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xs text-slate-400">
                <MapPin size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1d1d1f]">No delivery address saved yet</p>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Save your address now to enjoy instant 1-click checkout on all future orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAddress(true)}
                className="px-5 py-2.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add Delivery Address
              </button>
            </div>
          )}
        </div>

        {/* ── 4. NOTIFICATIONS CARD ── */}
        {permission !== 'granted' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-black/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <BellRing size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1d1d1f]">Never miss a shipment update</h3>
                <p className="text-xs text-[#86868b] mt-0.5">Get real-time push notifications when your order is placed, shipped, or delivered.</p>
              </div>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={isRequestingNotification || permission === 'denied'}
              className="w-full md:w-auto px-6 py-2.5 bg-[#1d1d1f] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {isRequestingNotification ? 'Enabling...' : permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
            </button>
          </div>
        )}

        {/* ── 5. ORDER HISTORY ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1d1d1f] flex items-center gap-2">
                <Package className="text-slate-500" size={22} />
                Order History &amp; Tracking
              </h2>
              <p className="text-xs text-[#86868b] mt-1">
                View your previous purchases, live Shadowfax shipment tracking, and tax invoices.
              </p>
            </div>
          </div>

          {fetching ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d1d1f]"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-[#f5f5f7] rounded-2xl border border-dashed border-gray-300 space-y-3">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Package size={24} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1d1d1f]">No orders placed yet</h3>
                <p className="text-xs text-[#86868b] mt-0.5">When you place an order, its live tracking status will appear here.</p>
              </div>
              <Link
                href="/products"
                className="inline-block px-5 py-2.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-black/5 rounded-2xl overflow-hidden hover:shadow-xs transition-shadow">
                  
                  {/* Order Top Bar */}
                  <div className="bg-[#f5f5f7] px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider mb-0.5">Order Placed</div>
                      <div className="text-xs font-bold text-[#1d1d1f]">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider mb-0.5">Total Amount</div>
                      <div className="text-xs font-bold text-[#1d1d1f]">₹{order.total_amount.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider mb-0.5">Status</div>
                      <div className={`text-xs font-bold capitalize ${['paid', 'delivered', 'shipped', 'out_for_delivery'].includes(order.status) || (order.status === 'pending' && order.payment_method === 'cod') ? 'text-green-600' : ['failed', 'cancelled'].includes(order.status) ? 'text-red-500' : 'text-orange-500'}`}>
                        {order.status === 'paid' ? 'Processing' : order.status === 'out_for_delivery' ? 'Out for Delivery' : order.status === 'pending' ? (order.payment_method === 'cod' ? 'Order Confirmed' : 'Payment Pending') : order.status}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider mb-0.5">Order ID</div>
                      <div className="text-xs text-[#1d1d1f] font-mono font-bold">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="flex flex-col items-end gap-1 mt-1">
                        {order.awb_number && (
                          <a 
                            href={`https://shadowfax.in/tracking/${order.awb_number}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[11px] text-blue-600 font-mono hover:underline flex items-center justify-end gap-1"
                          >
                            AWB: {order.awb_number}
                            <ExternalLink size={10} />
                          </a>
                        )}
                        <a 
                          href={`/invoice/${order.id}?print=true`}
                          target="_blank"
                          className="text-[11px] text-slate-600 hover:text-black transition-colors flex items-center justify-end gap-1 font-semibold"
                        >
                          Tax Invoice
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  {['failed', 'cancelled'].includes(order.status) ? (
                    <div className="bg-red-50/50 px-6 py-4 border-b border-black/5 flex items-center gap-3">
                      <AlertCircle className="text-red-500" size={18} />
                      <div>
                        <p className="text-xs font-bold text-red-600">Order {order.status === 'failed' ? 'Payment Failed' : 'Cancelled'}</p>
                        <p className="text-[11px] text-red-500 mt-0.5">Please contact Outflank support for assistance.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-7 border-b border-black/5 bg-white">
                      <div className="relative max-w-xl mx-auto">
                        <div className="absolute left-0 top-3.5 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full"></div>
                        <div
                          className="absolute left-0 top-3.5 -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-500"
                          style={{
                            width: order.status === 'delivered' ? '100%'
                              : order.status === 'out_for_delivery' ? '75%'
                              : ['shipped'].includes(order.status) ? '40%'
                              : '0%'
                          }}
                        ></div>

                        <div className="relative flex justify-between">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-500 text-white border-2 border-white shadow-xs z-10">
                              <Check size={13} strokeWidth={3} />
                            </div>
                            <p className="text-[11px] font-bold mt-1.5 text-[#1d1d1f]">Placed</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs z-10 transition-colors ${
                              ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                            }`}>
                              <Truck size={13} />
                            </div>
                            <p className={`text-[11px] font-bold mt-1.5 ${
                              ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'text-[#1d1d1f]' : 'text-slate-400'
                            }`}>Shipped</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs z-10 transition-colors ${
                              ['out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                            }`}>
                              <Package size={13} />
                            </div>
                            <p className={`text-[11px] font-bold mt-1.5 ${
                              ['out_for_delivery', 'delivered'].includes(order.status) ? 'text-[#1d1d1f]' : 'text-slate-400'
                            }`}>Out for Delivery</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs z-10 transition-colors ${
                              order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                            }`}>
                              <Check size={13} strokeWidth={3} />
                            </div>
                            <p className={`text-[11px] font-bold mt-1.5 ${
                              order.status === 'delivered' ? 'text-[#1d1d1f]' : 'text-slate-400'
                            }`}>Delivered</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Item List */}
                  <div className="p-5 sm:p-6 bg-white space-y-3">
                    {order.retail_order_items?.map((item, idx) => {
                      const custom = extractAccountCustomData(item, order);
                      const prodImg = (Array.isArray(item.products) ? item.products[0] : item.products)?.primary_image_url;

                      return (
                        <div key={item.id || idx} className="bg-[#fbfbfd] p-3.5 sm:p-4 rounded-xl border border-black/5 space-y-2.5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3">
                              {prodImg ? (
                                <div className="w-12 h-12 rounded-lg bg-white border border-black/5 overflow-hidden shrink-0 relative">
                                  <img src={prodImg} alt={item.product_name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                  <Package size={18} className="text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs sm:text-sm font-bold text-[#1d1d1f]">{item.product_name}</p>
                                <p className="text-[11px] text-[#86868b] mt-0.5">
                                  Qty: <strong className="text-slate-900">{item.quantity}</strong> {item.selected_color && <>• Color: <strong className="text-slate-900">{item.selected_color}</strong></>}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm font-black text-[#1d1d1f] shrink-0 text-right">
                              ₹{(item.price_at_time * item.quantity).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Customization Details */}
                          {custom && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 font-bold text-blue-700 text-[10px] uppercase tracking-wider">
                                  <Paintbrush size={10} className="text-blue-600" />
                                  Personalized Print Specification
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Placement: <strong className="text-slate-900">{custom.printPosition}</strong>
                                </span>
                              </div>

                              {custom.brandType === 'text' && custom.brandText && (
                                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                                  <span className="text-slate-400 text-[10px] font-bold uppercase">Text:</span>
                                  <span className="font-mono font-bold text-slate-900">"{custom.brandText}"</span>
                                  {custom.textColor && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 ml-2">
                                      <span 
                                        className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block shrink-0" 
                                        style={{ backgroundColor: custom.textColor }}
                                      />
                                      {custom.textColor}
                                    </span>
                                  )}
                                </div>
                              )}

                              {custom.brandType === 'logo' && (
                                <div className="flex items-center gap-2 pt-0.5">
                                  {custom.logoUrl && (
                                    <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                                      <img src={custom.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    </div>
                                  )}
                                  <span className="text-slate-700 text-[11px] font-medium">Uploaded Custom Artwork Attached</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
