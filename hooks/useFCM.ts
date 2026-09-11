"use client";

import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

const VAPID_KEY = 'BGPnz3IJ3plzcbbtoCGLSP3x3D0zZRKEDFSH4BppaHe1Q92gqb1XcjrMjbmLRVnWNhTwEbRfoKSiIODrf0PbxVo';

export function useFCM() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!messaging) return;

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Received foreground message: ', payload);
      // Optional: Show a custom toast notification here if you want
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const requestPermission = async () => {
    try {
      if (!messaging) {
        throw new Error('Messaging not supported on this browser');
      }

      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);

      if (currentPermission === 'granted' && user) {
        // Register service worker explicitly (optional but good practice)
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });

        if (token) {
          setFcmToken(token);
          // Send to backend
          await fetch('/api/notifications/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, uid: user.uid }),
          });
          return true;
        } else {
          console.warn('No registration token available. Request permission to generate one.');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
      return false;
    }
  };

  return { fcmToken, permission, requestPermission };
}
