import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  type: "order" | "dispatch" | "delivery" | "system";
}

interface NotificationCtx {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  sendPushNotification: (title: string, message: string, orderId?: string, type?: AppNotification["type"]) => void;
  requestPermission: () => Promise<boolean>;
  permission: NotificationPermission;
}

const Ctx = createContext<NotificationCtx | null>(null);

const STORAGE_KEY = "elevenx_notifications_v1";

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif_1",
    title: "Welcome to ElevenX Kit",
    message: "Firebase authentication & live cloud database are active. Browse matchday kits or create custom prints.",
    timestamp: "Just now",
    read: false,
    type: "system",
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.info("Web push notifications are not supported by this browser.");
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === "granted") {
        toast.success("Order push alerts enabled!");
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Notification request notice:", e);
      return false;
    }
  };

  const sendPushNotification = (
    title: string,
    message: string,
    orderId?: string,
    type: AppNotification["type"] = "order"
  ) => {
    const item: AppNotification = {
      id: "notif_" + Date.now(),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
      orderId,
      type,
    };

    setNotifications((prev) => [item, ...prev.slice(0, 20)]);

    // Display rich in-app toast
    toast(title, {
      description: message,
      icon: "🔔",
    });

    // Native browser push notification if granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.warn("Native push notice:", err);
      }
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Ctx.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        sendPushNotification,
        requestPermission,
        permission,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotifications outside NotificationProvider");
  return c;
}
