"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { getBrowserCache, setBrowserCache, removeBrowserCache } from './browserCache';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  houseNo?: string;
  street?: string;
  landmark?: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  tag?: 'Home' | 'Office' | 'Other';
  companyName?: string;
  gstin?: string;
  gender?: string;
}

export interface CustomerProfile {
  id?: string;
  firebase_uid: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  auth_provider?: 'google' | 'apple' | 'whatsapp';
  shipping_address?: ShippingAddress | null;
  saved_addresses?: ShippingAddress[];
  gender?: string | null;
  company_name?: string | null;
  gstin?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface ProfileUpdatePayload {
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: string;
  companyName?: string;
  gstin?: string;
  avatarUrl?: string;
  shippingAddress?: ShippingAddress;
  savedAddresses?: ShippingAddress[];
}

interface AuthContextType {
  user: User | null;
  loading: true | false;
  customerProfile: CustomerProfile | null;
  needsPhoneNumber: boolean;
  refreshProfile: () => Promise<void>;
  saveAddress: (address: ShippingAddress) => Promise<boolean>;
  updateProfile: (data: ProfileUpdatePayload) => Promise<boolean>;
  signOutCustomer: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  customerProfile: null,
  needsPhoneNumber: false,
  refreshProfile: async () => {},
  saveAddress: async () => false,
  updateProfile: async () => false,
  signOutCustomer: async () => {},
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch customer profile and saved address with intelligent browser caching
  const fetchProfile = useCallback(async (currentUid: string, force = false) => {
    const cacheKey = `outflank_customer_${currentUid}`;
    const cached = getBrowserCache<CustomerProfile>(cacheKey, PROFILE_CACHE_TTL_MS, 'local');

    if (cached?.data) {
      setCustomerProfile(cached.data);
      // If cache is fresh and not forced, completely eliminate the API call!
      if (!cached.isStale && !force) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/customer/profile?uid=${currentUid}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.customer) {
          setCustomerProfile(data.customer);
          setBrowserCache(cacheKey, data.customer, 'local');
          return;
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Error loading profile from server:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) {
      await fetchProfile(user.uid, true);
    }
  }, [user, fetchProfile]);

  // Save / update complete customer profile & details
  const updateProfile = useCallback(async (payload: ProfileUpdatePayload): Promise<boolean> => {
    if (!user?.uid) return false;
    const cacheKey = `outflank_customer_${user.uid}`;

    // Optimistically update local state & browser cache immediately
    const updated: CustomerProfile = {
      id: customerProfile?.id || `temp-${user.uid.slice(0, 8)}`,
      firebase_uid: user.uid,
      full_name: payload.fullName !== undefined ? payload.fullName : customerProfile?.full_name || null,
      phone: payload.phone !== undefined ? payload.phone : customerProfile?.phone || null,
      email: payload.email !== undefined ? payload.email : customerProfile?.email || null,
      avatar_url: payload.avatarUrl !== undefined ? payload.avatarUrl : customerProfile?.avatar_url || null,
      auth_provider: customerProfile?.auth_provider || (user.phoneNumber ? 'whatsapp' : 'google'),
      shipping_address: payload.shippingAddress !== undefined ? payload.shippingAddress : customerProfile?.shipping_address || null,
      saved_addresses: payload.savedAddresses !== undefined ? payload.savedAddresses : customerProfile?.saved_addresses || [],
      gender: payload.gender !== undefined ? payload.gender : customerProfile?.gender || null,
      company_name: payload.companyName !== undefined ? payload.companyName : customerProfile?.company_name || null,
      gstin: payload.gstin !== undefined ? payload.gstin : customerProfile?.gstin || null,
      created_at: customerProfile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: customerProfile?.last_login_at || new Date().toISOString(),
    };

    setCustomerProfile(updated);
    setBrowserCache(cacheKey, updated, 'local');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          ...payload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setCustomerProfile(data.customer);
          setBrowserCache(cacheKey, data.customer, 'local');
        }
        return true;
      }
    } catch (err) {
      console.error('[AuthContext] Error updating profile on server:', err);
    }
    // Return true since local state & cache were optimistically updated
    return true;
  }, [user, customerProfile]);

  // Save / update customer shipping address (auto-synced from checkout or account page)
  const saveAddress = useCallback(async (address: ShippingAddress): Promise<boolean> => {
    const cleanPhone = address.phone ? address.phone.replace(/\D/g, '').slice(-10) : undefined;
    const houseNo = address.houseNo?.trim() || '';
    const street = address.street?.trim() || '';
    const landmark = address.landmark?.trim() || address.addressLine2?.trim() || '';
    const landmarkText = landmark
      ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`)
      : '';
    const combinedStreet = [houseNo, street].filter(Boolean).join(', ');
    const fullAddress = address.address?.trim() || [combinedStreet, landmarkText].filter(Boolean).join(', ');

    const cleanAddress: ShippingAddress = {
      ...address,
      houseNo: houseNo || undefined,
      street: street || undefined,
      landmark: landmark || undefined,
      addressLine1: combinedStreet || address.addressLine1 || fullAddress,
      addressLine2: landmark || address.addressLine2 || undefined,
      address: fullAddress,
      phone: cleanPhone || address.phone,
    };
    return updateProfile({
      shippingAddress: cleanAddress,
      fullName: address.fullName?.trim() || undefined,
      phone: cleanPhone || undefined,
      email: address.email?.trim() || undefined,
    });
  }, [updateProfile]);

  const signOutCustomer = useCallback(async () => {
    if (user?.uid) {
      removeBrowserCache(`outflank_customer_${user.uid}`, 'local');
    }
    await signOut(auth);
    setUser(null);
    setCustomerProfile(null);
  }, [user]);

  // Check if an authenticated customer is missing their 10-digit mobile number
  const needsPhoneNumber = Boolean(
    user &&
    !loading &&
    customerProfile !== null &&
    (!customerProfile.phone || customerProfile.phone.replace(/\D/g, '').length < 10)
  );

  // Automatically open auth modal in required phone mode if customer lacks phone
  useEffect(() => {
    if (needsPhoneNumber) {
      setIsAuthModalOpen(true);
    }
  }, [needsPhoneNumber]);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => {
    // If phone number is mandatory and missing, prevent closing
    if (needsPhoneNumber) return;
    setIsAuthModalOpen(false);
  }, [needsPhoneNumber]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setCustomerProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        customerProfile,
        needsPhoneNumber,
        refreshProfile,
        saveAddress,
        updateProfile,
        signOutCustomer,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
