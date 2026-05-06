import { writable } from 'svelte/store';

/** Global sidebar collapsed state — shared between Sidebar and layout */
export const sidebarCollapsed = writable(false);
