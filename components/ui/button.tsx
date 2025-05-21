import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lp-accent))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-white border-2 border-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent))] hover:bg-[hsl(var(--lp-accent))]/10 hover:text-[hsl(var(--lp-accent))]",
        destructive:
          "bg-[hsl(var(--lp-destructive))]/10 border-2 border-[hsl(var(--lp-destructive))] text-[hsl(var(--lp-destructive))] hover:bg-[hsl(var(--lp-destructive))]/20 hover:text-[hsl(var(--lp-destructive))]",
        outline:
          "bg-white border border-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent))] hover:bg-[hsl(var(--lp-accent))]/5 hover:text-[hsl(var(--lp-accent))]",
        secondary:
          "bg-[hsl(var(--lp-secondary))]/10 border border-[hsl(var(--lp-secondary))] text-[hsl(var(--lp-secondary-foreground))] hover:bg-[hsl(var(--lp-secondary))]/20",
        ghost: "bg-transparent text-[hsl(var(--lp-accent))] hover:bg-[hsl(var(--lp-accent))]/10",
        link: "text-[hsl(var(--lp-accent))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
