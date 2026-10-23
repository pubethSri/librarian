<script lang="ts">
	import { extraPlace, extraTitle, type VolumeLike } from '$lib/utils/volume';

	// Shown in place of an extra's volume number: its title first, then a small
	// gold EXTRA tag. Where it sits ("after vol. 8") follows when there is no
	// title or `place` asks for it; hover always says.
	let {
		book,
		place = false,
		class: className = ''
	}: { book: VolumeLike; place?: boolean; class?: string } = $props();

	const name = $derived(extraTitle(book));
	const where = $derived(extraPlace(book));
</script>

<span
	class="inline-flex max-w-full min-w-0 items-center gap-1.5 align-middle {className}"
	title={name ? `${name} — extra, ${where}` : `Extra, ${where}`}
>
	{#if name}<span class="truncate">{name}</span>{/if}
	<span
		class="shrink-0 rounded border border-highlight/40 bg-highlight-soft px-1 text-[9px] leading-4 font-bold tracking-wider text-highlight-ink"
		>EXTRA</span
	>
	{#if place || !name}<span class="shrink-0 text-xs text-muted-foreground">{where}</span>{/if}
</span>
