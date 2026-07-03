import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
    "transition-colors",
  ),
  {
    variants: {
      variant: {
        default: "bg-[var(--surface)] text-[var(--text-muted)]",
        accent:
          "border-transparent bg-[var(--accent)]/10 text-[var(--accent)]",
        success:
          "border-transparent bg-[var(--success)]/10 text-[var(--success)]",
        warning:
          "border-transparent bg-[var(--warning)]/10 text-[var(--warning)]",
        danger:
          "border-transparent bg-[var(--danger)]/10 text-[var(--danger)]",
        outline: "text-[var(--text-muted)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
