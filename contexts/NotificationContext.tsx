
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { Notification, NotificationType } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType, duration = 3000) => {
    setNotifications((prev) => {
        // 1. Deduplication: If the EXACT same message is already visible, ignore this call.
        // This prevents "spam" when a loop triggers the same error multiple times rapidly.
        if (prev.length > 0 && prev[0].message === message) {
            return prev;
        }

        // 2. Singleton Logic: User requested "one notification should appear".
        // We replace the existing notification with the new one.
        
        // Clear existing timeout to prevent the previous notification's timer from hiding the new one prematurely
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        const id = Math.random().toString(36).substring(2, 9);
        const newNotification = { id, message, type, duration };
        
        // Schedule removal for the new notification
        if (duration > 0) {
            timeoutRef.current = setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return [newNotification];
    });
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
