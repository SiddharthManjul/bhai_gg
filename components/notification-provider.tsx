"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2Icon, AlertCircleIcon, InfoIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type NotificationType = "success" | "error" | "info"

interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showNotification = useCallback(
    (message: string, type: NotificationType = "info", title?: string) => {
      const id = Math.random().toString(36).substring(7)
      const notification: Notification = { id, type, message, title }

      setNotifications((prev) => [...prev, notification])

      // Auto-remove after 5 seconds
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    },
    [removeNotification]
  )

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showNotification(message, "success", title)
    },
    [showNotification]
  )

  const showError = useCallback(
    (message: string, title?: string) => {
      showNotification(message, "error", title)
    },
    [showNotification]
  )

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showNotification(message, "info", title)
    },
    [showNotification]
  )

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircle2Icon className="h-4 w-4" />
      case "error":
        return <AlertCircleIcon className="h-4 w-4" />
      case "info":
        return <InfoIcon className="h-4 w-4" />
    }
  }

  return (
    <NotificationContext.Provider
      value={{ showNotification, showSuccess, showError, showInfo }}
    >
      {children}

      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            variant={notification.type === "error" ? "destructive" : "default"}
            className="relative shadow-lg"
          >
            {getIcon(notification.type)}
            {notification.title && <AlertTitle>{notification.title}</AlertTitle>}
            <AlertDescription>{notification.message}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeNotification(notification.id)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </Alert>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider")
  }
  return context
}
