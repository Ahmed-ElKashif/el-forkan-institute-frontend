import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/* The design system adds colour names Tailwind does not ship (brand, canvas,
   att-present-bg, …). tailwind-merge needs to know they are colours so that a
   caller's `bg-danger` correctly replaces a component's `bg-brand` instead of
   both landing in the class list. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['sm', 'md', 'lg', 'xl', 'full'],
    },
  },
});

/** Merge class names, letting a caller's className win over the component's. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
