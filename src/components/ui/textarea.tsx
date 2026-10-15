import type { TextareaHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={twMerge("field min-h-28 resize-y py-3 leading-6", className)} {...props} />;
}
