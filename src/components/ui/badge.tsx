import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const badgeStyles = cva("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none", {
  variants: {
    variant: {
      default: "border-line-strong bg-surface-raised text-muted",
      accent: "border-accent/20 bg-accent-soft text-accent-strong",
      success: "border-success/20 bg-success-soft text-success",
      warning: "border-warning/20 bg-warning-soft text-warning",
      danger: "border-danger/20 bg-danger-soft text-danger",
      info: "border-info/20 bg-info-soft text-info",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={twMerge(badgeStyles({ variant }), className)} {...props} />;
}
