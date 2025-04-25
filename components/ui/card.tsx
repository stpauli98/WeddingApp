import * as React from "react"

import { cn } from "@/lib/utils"

// Glavna kartica: luksuzna bela pozadina, tanak zlatni border, diskretna senka
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white rounded-xl border border-[#E2C275] shadow-lg p-0",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

// Header: centriran, luksuzan padding
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col items-center p-8 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// Naslov: veći, tamnosiv, elegantan font, zlatna linija ispod
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <>
    <div
      ref={ref}
      className={cn(
        "text-3xl font-serif font-semibold text-gray-800 text-center tracking-tight mb-2",
        className
      )}
      {...props}
    />
    <div className="h-1 w-16 bg-[#E2C275] rounded-full mx-auto mb-2" />
  </>
))
CardTitle.displayName = "CardTitle"

// Opis: neutralan, sofisticiran font, centriran
const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-base text-gray-600 text-center font-light", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// Sadržaj: prostran, bez dodatnih efekata
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-8 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// Footer: razmaknut sadržaj, diskretna siva linija gore
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between p-6 pt-4 border-t border-gray-100", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
