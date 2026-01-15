"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationSetup() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    if (Notification.permission === "granted") {
      // Check if already subscribed
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        return;
      }

      // Get VAPID public key
      const keyRes = await fetch("/api/notifications/vapid-key");
      if (!keyRes.ok) {
        throw new Error("Nie mozna pobrac klucza VAPID");
      }
      const { publicKey } = await keyRes.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to server
      const subJson = subscription.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) {
        throw new Error("Nie mozna zapisac subskrypcji");
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error("Error unsubscribing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (permission === "unsupported") {
    return null; // Don't show anything if not supported
  }

  if (permission === "denied") {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Powiadomienia zablokowane</p>
            <p className="text-xs text-muted-foreground">
              Odblokuj w ustawieniach przegladarki
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Powiadomienia wlaczone</p>
              <p className="text-xs text-muted-foreground">
                Otrzymasz alerty o wygasajacych produktach
              </p>
            </div>
          </div>
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wylacz"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Wlacz powiadomienia</p>
            <p className="text-xs text-muted-foreground">
              Otrzymuj alerty o wygasajacych produktach
            </p>
          </div>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wlacz"}
        </button>
      </div>
    </div>
  );
}
