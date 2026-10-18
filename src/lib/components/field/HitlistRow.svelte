<script lang="ts">
	// One Hitlist row (rules in $lib/field/logic): released → black card, with a
	// light-blue diamond when the series is on the watchlist (= priority); watchlist
	// only → white row; bought today with nothing left → faded, struck through in
	// gold ("ticked off"). Tap opens the series in Find; swipe left = "Bought".
	import { resolve } from '$app/paths';
	import { Check, ShoppingBag } from '@lucide/svelte';
	import SwipeRow from '$lib/components/field/SwipeRow.svelte';
	import HitlistBar from '$lib/components/field/HitlistBar.svelte';
	import { hitlistBar, volumeRanges, volumeSpan, type HitlistItem } from '$lib/field/logic';
	import { SERIES_STATUS_LABELS, type SeriesListItem } from '$lib/types';

	let {
		item,
		onbought
	}: {
		item: HitlistItem<SeriesListItem>;
		/** Swipe left: open the "Bought" sheet for this row */
		onbought: () => void;
	} = $props();

	const released = $derived(item.confirmedTo !== null);
	const boughtNote = $derived(
		item.boughtToday.length > 0 ? `bought vol. ${volumeRanges(item.boughtToday)} today` : ''
	);
	const bar = $derived(hitlistBar(item));
</script>

<SwipeRow
	class="rounded-xl print:rounded-none"
	surface="bg-transparent"
	label="Bought"
	icon={ShoppingBag}
	tone="add"
	onswipe={onbought}
>
	{#if item.done}
		<a
			href={resolve(`/field?series=${item.series.id}`)}
			aria-label="{item.series.shortName}: {boughtNote}"
			class="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 opacity-60 transition-colors active:bg-accent print:min-h-0 print:rounded-none print:border-0 print:border-b print:px-1 print:py-1"
		>
			<span class="min-w-0 flex-1">
				<span
					class="block truncate text-base font-medium text-foreground line-through decoration-highlight decoration-[1.5px] print:text-sm"
				>
					{item.series.shortName}
				</span>
				<span class="block truncate text-xs text-muted-foreground">{boughtNote}</span>
			</span>
			<span class="flex shrink-0 items-center gap-1 text-sm font-semibold text-highlight-ink">
				<Check class="h-4 w-4" /> today
			</span>
		</a>
	{:else if released}
		<a
			href={resolve(`/field?series=${item.series.id}`)}
			aria-label="{item.series.shortName}: vol. {volumeSpan(
				item.next,
				item.confirmedTo ?? item.next
			)} out{item.series.watchlist ? ', on the watchlist' : ''}"
			class="flex min-h-14 items-center gap-3 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-opacity active:opacity-80 print:min-h-0 print:rounded-none print:border-b print:bg-transparent print:px-1 print:py-1 print:text-black"
		>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-base font-semibold print:text-sm">
					{#if item.series.watchlist}
						<svg
							viewBox="0 0 8 14"
							class="mr-1.5 inline-block h-3.5 w-2 fill-info-light align-[-1px]"
							aria-hidden="true"><path d="M4 0 8 7 4 14 0 7Z" /></svg
						>
					{/if}{item.series.shortName}
				</span>
				<span class="block truncate text-xs opacity-75">
					out up to vol. {item.confirmedTo}{item.series.watchlist
						? ''
						: ' · not on the watchlist'}{item.missing.length > 0
						? ` · also missing ${item.missing.join(', ')}`
						: ''}
				</span>
				{#if boughtNote}<span class="block truncate text-xs text-[#d8c27a]">{boughtNote}</span>{/if}
				<span class="block print:hidden"><HitlistBar model={bar} dark /></span>
			</span>
			<span class="shrink-0 text-xl font-bold tabular-nums print:text-base">
				<span class="mr-1 align-middle text-[10px] font-normal tracking-wide uppercase opacity-75"
					>vol.</span
				>{volumeSpan(item.next, item.confirmedTo ?? item.next)}
			</span>
		</a>
	{:else}
		<a
			href={resolve(`/field?series=${item.series.id}`)}
			class="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 transition-colors active:bg-accent print:min-h-0 print:rounded-none print:border-0 print:border-b print:px-1 print:py-1"
		>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-base font-medium text-foreground print:text-sm">
					{item.series.shortName}
				</span>
				{#if item.missing.length > 0 || item.series.status !== 'ongoing'}
					<span class="block truncate text-xs text-muted-foreground">
						{#if item.series.status !== 'ongoing'}{SERIES_STATUS_LABELS[item.series.status]}{item
								.missing.length > 0
								? ' · '
								: ''}{/if}{#if item.missing.length > 0}missing
							<span class="tabular-nums">{item.missing.join(', ')}</span>{/if}
					</span>
				{/if}
				{#if boughtNote}<span class="block truncate text-xs text-highlight-ink">{boughtNote}</span
					>{/if}
				<span class="block print:hidden"><HitlistBar model={bar} /></span>
			</span>
			<span class="shrink-0 text-xl font-semibold text-foreground tabular-nums print:text-base">
				<span
					class="mr-1 align-middle text-[10px] font-normal tracking-wide text-muted-foreground uppercase"
					>vol.</span
				>{item.next}
			</span>
		</a>
	{/if}
</SwipeRow>
