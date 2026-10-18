<script lang="ts">
	// A list row you swipe left to act on (Spotify-style "add to queue"). Vertical
	// scrolling stays native (touch-action: pan-y); a horizontal drag past THRESHOLD
	// fires `onswipe`. The click that ends a swipe is swallowed. Rows still need a
	// visible button for the same action — a swipe is a shortcut, not the only way.
	import type { Component, Snippet } from 'svelte';

	let {
		onswipe,
		label,
		icon: Icon,
		tone = 'add',
		disabled = false,
		children
	}: {
		onswipe: () => void;
		/** What the swipe does, shown behind the row: "Queue", "Remove" */
		label: string;
		icon: Component<{ class?: string }>;
		tone?: 'add' | 'remove';
		disabled?: boolean;
		children: Snippet;
	} = $props();

	const THRESHOLD = 72;
	const MAX = 120;

	let offset = $state(0);
	let dragging = $state(false);
	let startX = 0;
	let startY = 0;
	let axis: 'h' | 'v' | null = null;
	let swallowClick = false;

	function down(e: PointerEvent) {
		if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
		startX = e.clientX;
		startY = e.clientY;
		axis = null;
		dragging = true;
	}

	function move(e: PointerEvent) {
		if (!dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (axis === null) {
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
			axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
			if (axis === 'h') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		}
		if (axis === 'h') offset = Math.max(-MAX, Math.min(0, dx));
	}

	function up() {
		if (!dragging) return;
		dragging = false;
		if (axis === 'h') {
			swallowClick = true;
			if (offset <= -THRESHOLD) onswipe();
		}
		axis = null;
		offset = 0;
	}

	function click(e: MouseEvent) {
		if (swallowClick) {
			e.stopPropagation();
			e.preventDefault();
			swallowClick = false;
		}
	}

	const armed = $derived(offset <= -THRESHOLD);
</script>

<div class="relative overflow-hidden">
	<div
		aria-hidden="true"
		class="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 pr-4 text-sm font-semibold transition-colors {tone ===
		'add'
			? armed
				? 'bg-sky-600 text-white'
				: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
			: armed
				? 'bg-destructive text-white'
				: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'}"
		style="width: {Math.max(-offset, 0)}px; opacity: {offset === 0 ? 0 : 1}"
	>
		<Icon class="h-4 w-4 shrink-0" />
		{#if -offset > 56}<span class="whitespace-nowrap">{label}</span>{/if}
	</div>
	<div
		role="presentation"
		class="relative bg-background select-none {dragging ? '' : 'transition-transform duration-200'}"
		style="transform: translateX({offset}px); touch-action: pan-y"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onclickcapture={click}
	>
		{@render children()}
	</div>
</div>
