"use client";

import * as React from "react"
import { cn } from "@/lib/utils"

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; collapsible?: boolean }
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
))
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    // Basic toggle logic would require context, simplified for this implementation to just be a button
    // Since we don't have Radix, we'll make a quick interactive component or just styling.
    // For now, let's make it a simple clickable header that relies on parent state or just renders static if complex.
    // Actually, let's use a simple Detail/Summary or just standard state if we can.
    // But maintaining the API used in FAQ.tsx:
    return (
        <button
            ref={ref}
            className={cn(
                "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                className
            )}
            onClick={(e) => {
                // Toggle logic hack for pure UI component without context
                const content = e.currentTarget.closest('[class*="border-b"]')?.querySelector('[class*="overflow-hidden"]');
                if (content instanceof HTMLElement) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                }
            }}
            {...props}
        >
            {children}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 transition-transform duration-200"
            >
                <path d="m6 9 6 6 6-6" />
            </svg>
        </button>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("overflow-hidden text-sm transition-all animate-accordion-down", className)}
        {...props}
    >
        <div className="pb-4 pt-0">{children}</div>
    </div>
))
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
