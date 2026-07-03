"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
    "text-sm font-medium transition-all duration-200",
    "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--text)] text-[var(--bg)] shadow-[var(--shadow-sm)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]",
        secondary:
          "border bg-[var(--elevated)] text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface)]",
        outline:
          "border bg-transparent text-[var(--text)] hover:bg-[var(--surface)]",
        ghost:
          "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
        danger:
          "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:opacity-90",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-9 px-5",
        sm: "h-8 px-4 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
