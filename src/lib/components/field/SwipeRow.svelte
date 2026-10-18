<script lang="ts">
	// A list row you swipe to act on (Spotify-style). Swipe left = `onswipe` (Queue /
	// Remove); swipe right = `onswiperight` when given (Finished… on Up next). Vertical
	// scrolling stays native (touch-action: pan-y); a horizontal drag past THRESHOLD
	// fires the action. The click that ends a swipe is swallowed. Rows still need a
	// visible way to do the same thing — a swipe is a shortcut, not the only way.
	import type { Component, Snippet } from 'svelte';

	type Icon = Component<{ class?: string }>;

	let {
		onswipe,
		label,
		icon: LeftIcon,
		tone = 'add',
		onswiperight,
		rightLabel = '',
		rightIcon: RightIcon,
		disabled = false,
		class: className = '',
		surface = 'bg-background',
		children
	}: {
		onswipe: () => void;
		/** What the left swipe does, shown behind the row — one short word: "Queue", "Remove" */
		label: string;
		icon: Icon;
		tone?: 'add' | 'remove';
		/** Optional right swipe, one short word: "Finished" */
		onswiperight?: () => void;
		rightLabel?: string;
		rightIcon?: Icon;
		disabled?: boolean;
		/** Outer shape, e.g. `rounded-xl` for a card row (the strip is clipped to it) */
		class?: string;
		/** The sliding layer's background; `bg-transparent` when the child is its own card */
		surface?: string;
		children: Snippet;
	} = $props();

	const THRESHOLD = 72;
	const MAX = 140;
	/** The label shows only once the strip is wide enough for icon + word (keep labels short) */
	const LABEL_AT = 104;

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
		if (axis === 'h') offset = Math.max(-MAX, Math.min(onswiperight ? MAX : 0, dx));
	}

	function up() {
		if (!dragging) return;
		dragging = false;
		if (axis === 'h') {
			swallowClick = true;
			if (offset <= -THRESHOLD) onswipe();
			else if (offset >= THRESHOLD) onswiperight?.();
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

	const armed = $derived(Math.abs(offset) >= THRESHOLD);
</script>

<div class="relative overflow-hidden {className}">
	{#if offset < 0}
		<div
			aria-hidden="true"
			class="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 overflow-hidden pr-4 text-sm font-semibold transition-colors {tone ===
			'add'
				? armed
					? 'bg-info text-white'
					: 'bg-info/15 text-info-ink'
				: armed
					? 'bg-destructive text-white'
					: 'bg-red-100 text-red-800'}"
			style="width: {-offset}px"
		>
			<LeftIcon class="h-4 w-4 shrink-0" />
			{#if -offset >= LABEL_AT}<span class="whitespace-nowrap">{label}</span>{/if}
		</div>
	{:else if offset > 0 && RightIcon}
		<div
			aria-hidden="true"
			class="absolute inset-y-0 left-0 flex items-center gap-1.5 overflow-hidden pl-4 text-sm font-semibold transition-colors {armed
				? 'bg-emerald-700 text-white'
				: 'bg-emerald-100 text-emerald-900'}"
			style="width: {offset}px"
		>
			<RightIcon class="h-4 w-4 shrink-0" />
			{#if offset >= LABEL_AT}<span class="whitespace-nowrap">{rightLabel}</span>{/if}
		</div>
	{/if}
	<div
		role="presentation"
		class="relative {surface} select-none {dragging ? '' : 'transition-transform duration-200'}"
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
