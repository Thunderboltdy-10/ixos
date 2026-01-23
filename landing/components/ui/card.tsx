import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverEffect = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border border-white/10 bg-surface-1/50 backdrop-blur-md p-6 shadow-xl",
                    hoverEffect && "transition-all duration-300 hover:border-brand-teal/30 hover:bg-surface-1/80 hover:shadow-brand-teal/10 hover:-translate-y-1",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Card.displayName = "Card"

export { Card }
