"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "success" | "error"

interface ToastNotificationProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: ToastVariant
  title?: string
  description?: string
  duration?: number
  className?: string
}

export function ToastNotification({
  open: controlledOpen,
  onOpenChange,
  variant = "success",
  title,
  description,
  duration = 5000,
  className,
}: ToastNotificationProps) {
  const [open, setOpen] = useState(controlledOpen || false)

  const isControlled = controlledOpen !== undefined
  const currentOpen = isControlled ? controlledOpen : open

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, setOpen, onOpenChange])

  useEffect(() => {
    if (currentOpen && duration > 0) {
      const timer = setTimeout(() => {
        handleOpenChange(false)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [currentOpen, duration, handleOpenChange])

  if (!currentOpen) return null

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex max-w-md animate-in slide-in-from-top-2 fade-in-20 items-start gap-3 rounded-lg p-4 shadow-lg",
        variant === "success"
          ? "bg-green-50 text-green-900 border border-green-200"
          : variant === "error"
            ? "bg-red-50 text-red-900 border border-red-200"
            : "",
        className,
      )}
    >
      <div className="flex-shrink-0">
        {variant === "success" ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="flex-1">
        {title && <h3 className="font-medium">{title}</h3>}
        {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
      </div>
      <button
        onClick={() => handleOpenChange(false)}
        className="flex-shrink-0 rounded-full p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
