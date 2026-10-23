<script lang="ts">
	// Where a queued book sits in its series (`seriesBar` in $lib/queue): grey = read,
	// gold = this book, light = still to read. Decorative; the row's text says the volume.
	import type { SeriesBarModel } from '$lib/queue';

	let {
		model,
		tone = 'light',
		class: className = ''
	}: {
		model: SeriesBarModel | null;
		/** `dark` on a dark card (Reading now) */
		tone?: 'light' | 'dark';
		class?: string;
	} = $props();

	const read = $derived(tone === 'dark' ? 'bg-white/55' : 'bg-bar-read');
	const unread = $derived(tone === 'dark' ? 'bg-white/20' : 'bg-border');
</script>

{#if model?.kind === 'segments'}
	<span class="flex w-full max-w-44 items-center gap-0.5 {className}" aria-hidden="true">
		{#each model.segments as segment, i (i)}
			<span
				class="flex-1 rounded-full {segment === 'this'
					? 'h-1.5 bg-highlight'
					: `h-1 ${segment === 'read' ? read : unread}`}"
			></span>
		{/each}
	</span>
{:else if model?.kind === 'continuous'}
	<span class="relative block h-1.5 w-full max-w-44 {className}" aria-hidden="true">
		<span class="absolute inset-x-0 top-px h-1 rounded-full {unread}"></span>
		<span
			class="absolute top-px left-0 h-1 rounded-full {read}"
			style="width: {(model.read / model.total) * 100}%"
		></span>
		{#if model.to !== undefined}
			<!-- A run: its span in gold -->
			<span
				class="absolute top-0 h-1.5 rounded-full bg-highlight"
				style="left: calc({model.at * 100}% - 3px); width: calc({(model.to - model.at) *
					100}% + 6px)"
			></span>
		{:else}
			<span
				class="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-highlight"
				style="left: {model.at * 100}%"
			></span>
		{/if}
	</span>
{/if}
