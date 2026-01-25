"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useParticleMagnet } from "@/hooks/useParticleMagnet";

const buttonVariants = cva(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
    {
        variants: {
            variant: {
                primary:
                    "bg-accent-teal text-bg-primary hover:bg-accent-teal-glow hover:text-bg-secondary shadow-lg shadow-accent-teal/20",
                secondary:
                    "border border-border-medium bg-transparent text-text-primary hover:bg-surface-glass hover:border-accent-teal/50",
                ghost:
                    "hover:bg-accent-teal/10 hover:text-accent-teal",
                link: "text-text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-6 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-12 rounded-md px-8 text-base",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    hasParticleMagnet?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild: _asChild = false, hasParticleMagnet = false, ...props }, ref) => {
        void _asChild;
        const localRef = React.useRef<HTMLButtonElement>(null);
        const combinedRef = (node: HTMLButtonElement) => {
            localRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        };

        useParticleMagnet(hasParticleMagnet ? localRef : { current: null });

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={combinedRef}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
