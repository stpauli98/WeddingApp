import { ToastNotification } from "./toastNotification"

interface ErrorToastProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  duration?: number
  className?: string
}

export function ErrorToast({
  title = "Greška!",
  description = "Došlo je do greške prilikom izvršavanja operacije.",
  ...props
}: ErrorToastProps) {
  return <ToastNotification variant="error" title={title} description={description} {...props} />
}
