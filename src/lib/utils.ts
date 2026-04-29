import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ─── Utility types for shadcn-svelte nova components ─────────────────────────

/** Adds an optional `ref` binding for the underlying DOM element. */
export type WithElementRef<T, El extends HTMLElement = HTMLElement> = T & {
	ref?: El | null;
};

/** Removes the `children` snippet prop. */
export type WithoutChildren<T> = Omit<T, 'children'>;

/** Removes the `child` snippet prop. */
export type WithoutChild<T> = Omit<T, 'child'>;

/** Removes both `children` and `child` snippet props. */
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;
