import { ToastNotification } from "./toastNotification"

interface SuccessToastProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  duration?: number
  className?: string
}

export function SuccessToast({
  title = "Uspješno!",
  description = "Operacija je uspješno izvršena.",
  ...props
}: SuccessToastProps) {
  return <ToastNotification variant="success" title={title} description={description} {...props} />
}
