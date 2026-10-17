<script lang="ts">
	// Hitlist: what to look for at the fair. Confirmed new volumes first (any
	// series whose released volume is past what you own — black cards), then
	// the watchlist's next volumes by publisher; tag filter; Copy and save.
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { Copy, Printer, Star, X } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBooksListQuery } from '$lib/queries/books';
	import {
		buildHitlist,
		confirmedNew,
		groupBySeries,
		hitlistTags,
		hitlistText,
		todayLocal,
		volumeSpan
	} from '$lib/field/logic';
	import { copyText } from '$lib/field/clipboard';
	import { formatDay } from '$lib/console/logic';
	import { SERIES_STATUS_LABELS } from '$lib/types';

	const seriesQuery = createSeriesListQuery({ fresh: true });
	const booksQuery = createBooksListQuery({ fresh: true });

	let selectedTags = $state<number[]>([]);
	/** The text, shown for a manual copy when the browser refuses to copy */
	let manualCopy = $state<string | null>(null);

	const loading = $derived(seriesQuery.isPending || booksQuery.isPending);
	const allSeries = $derived(seriesQuery.data ?? []);
	const booksBySeries = $derived(groupBySeries(booksQuery.data ?? []));
	/** Every confirmed series (unfiltered): they stay out of the watchlist groups */
	const confirmedAll = $derived(confirmedNew(allSeries, booksBySeries));
	const confirmedIds = $derived(new Set(confirmedAll.map((c) => c.series.id)));
	const confirmed = $derived(confirmedNew(allSeries, booksBySeries, selectedTags));
	const tags = $derived(hitlistTags(allSeries, confirmedIds));
	const groups = $derived(buildHitlist(allSeries, booksBySeries, selectedTags, confirmedIds));
	const count = $derived(groups.reduce((n, g) => n + g.items.length, 0) + confirmed.length);
	const watchlistSize = $derived(allSeries.filter((s) => s.watchlist).length);
	const totalSize = $derived(allSeries.filter((s) => s.watchlist || confirmedIds.has(s.id)).length);

	function toggleTag(id: number) {
		selectedTags = selectedTags.includes(id)
			? selectedTags.filter((t) => t !== id)
			: [...selectedTags, id];
	}

	async function copy() {
		const text = hitlistText(groups, confirmed);
		if (await copyText(text)) {
			manualCopy = null;
			toast.success(`Copied ${count} series`);
		} else {
			manualCopy = text;
		}
	}

	function selectAll(e: Event) {
		(e.currentTarget as HTMLTextAreaElement).select();
	}
</script>

<svelte:head>
	<title>Hitlist — Field Mode</title>
</svelte:head>

<div class="mx-auto max-w-md print:max-w-none">
	<div class="flex items-center gap-2 px-1 pb-3">
		<div class="min-w-0 flex-1">
			<h1 class="text-lg font-semibold text-foreground">Hitlist</h1>
			<p class="text-xs text-muted-foreground">
				{#if loading}
					Loading…
				{:else}
					{count}{selectedTags.length > 0 ? ` of ${totalSize}` : ''} series to look for
				{/if}
				<span class="hidden print:inline"> · {formatDay(todayLocal())}</span>
			</p>
		</div>
		<button
			type="button"
			onclick={copy}
			disabled={loading || count === 0}
			class="flex h-11 items-center gap-1.5 rounded-xl border border-input px-3 text-sm font-medium text-foreground active:bg-accent disabled:opacity-40 print:hidden"
		>
			<Copy class="h-4 w-4" /> Copy
		</button>
		<button
			type="button"
			onclick={() => window.print()}
			disabled={loading || count === 0}
			class="flex h-11 items-center gap-1.5 rounded-xl border border-input px-3 text-sm font-medium text-foreground active:bg-accent disabled:opacity-40 print:hidden"
			aria-label="Print"
		>
			<Printer class="h-4 w-4" />
		</button>
	</div>

	{#if manualCopy !== null}
		<div class="mb-4 rounded-xl border border-border p-3 print:hidden">
			<div class="mb-2 flex items-center gap-2">
				<p class="min-w-0 flex-1 text-xs text-muted-foreground">
					This browser won't copy here — select the text and copy it.
				</p>
				<button
					type="button"
					onclick={() => (manualCopy = null)}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
			<textarea
				readonly
				value={manualCopy}
				onfocus={selectAll}
				rows="8"
				class="w-full rounded-lg border border-input bg-background p-2 font-mono text-xs"
			></textarea>
		</div>
	{/if}

	{#if tags.length > 0}
		<div
			class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] print:hidden"
			role="group"
			aria-label="Filter by tag"
		>
			{#each tags as tag (tag.id)}
				{@const on = selectedTags.includes(tag.id)}
				<button
					type="button"
					aria-pressed={on}
					onclick={() => toggleTag(tag.id)}
					class="h-9 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap transition-colors {on
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border text-muted-foreground active:bg-accent'}"
				>
					{tag.name}
				</button>
			{/each}
			{#if selectedTags.length > 0}
				<button
					type="button"
					onclick={() => (selectedTags = [])}
					class="h-9 shrink-0 px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
				>
					Clear
				</button>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="space-y-2">
			{#each Array(5) as _, i (i)}
				<Skeleton class="h-14 rounded-xl" />
			{/each}
		</div>
	{:else if seriesQuery.isError || booksQuery.isError}
		<p class="py-8 text-center text-sm text-destructive">
			Couldn't load the collection. Check the connection and try again.
		</p>
	{:else if watchlistSize === 0 && confirmedAll.length === 0}
		<div class="py-12 text-center">
			<Star class="mx-auto h-8 w-8 text-muted-foreground" />
			<p class="mt-3 text-base font-medium text-foreground">The watchlist is empty</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Star series on the desktop (Edit Series → Watchlist) to list them here.
			</p>
		</div>
	{:else if count === 0}
		<p class="py-10 text-center text-sm text-muted-foreground">
			No series on the list has all the selected tags.
		</p>
	{:else}
		<div class="space-y-5 print:space-y-3">
			{#if confirmed.length > 0}
				<section class="break-inside-avoid" aria-label="Confirmed new volumes">
					<h2
						class="px-1 pb-2 text-xs font-semibold tracking-wide text-foreground uppercase print:pb-1"
					>
						Confirmed new volumes
						<span class="font-normal text-muted-foreground normal-case">· {confirmed.length}</span>
					</h2>
					<ul class="space-y-2">
						{#each confirmed as item (item.series.id)}
							<li>
								<a
									href={resolve(`/field?series=${item.series.id}`)}
									class="flex min-h-14 items-center gap-3 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-opacity active:opacity-80"
								>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-base font-semibold">
											{item.series.shortName}
										</span>
										<span class="block truncate text-xs opacity-75">
											out up to vol. {item.to}{item.series.watchlist
												? ''
												: ' · not on the watchlist'}{item.missing.length > 0
												? ` · also missing ${item.missing.join(', ')}`
												: ''}
										</span>
									</span>
									<span class="shrink-0 font-mono text-xl font-bold tabular-nums">
										<span
											class="mr-1 align-middle font-sans text-[10px] font-normal tracking-wide uppercase opacity-75"
											>vol.</span
										>{volumeSpan(item.from, item.to)}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
				{#if groups.length > 0}
					<p class="px-1 pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Watchlist — next volume
					</p>
				{/if}
			{/if}
			{#each groups as group (group.publisher ?? '')}
				<section class="break-inside-avoid">
					<h2
						class="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase print:pb-1 print:text-black"
					>
						{group.publisher ?? 'Unknown publisher'}
						<span class="font-normal normal-case">· {group.items.length}</span>
					</h2>
					<ul class="space-y-2 print:space-y-0">
						{#each group.items as item (item.series.id)}
							<li>
								<a
									href={resolve(`/field?series=${item.series.id}`)}
									class="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 py-2 transition-colors active:bg-accent print:min-h-0 print:rounded-none print:border-0 print:border-b print:px-1 print:py-1"
								>
									<span class="min-w-0 flex-1">
										<span
											class="block truncate text-base font-medium text-foreground print:text-sm"
										>
											{item.series.shortName}
										</span>
										{#if item.missing.length > 0 || item.series.status !== 'ongoing'}
											<span class="block truncate text-xs text-muted-foreground">
												{#if item.series.status !== 'ongoing'}{SERIES_STATUS_LABELS[
														item.series.status
													]}{item.missing.length > 0
														? ' · '
														: ''}{/if}{#if item.missing.length > 0}missing
													<span class="font-mono tabular-nums">{item.missing.join(', ')}</span>{/if}
											</span>
										{/if}
									</span>
									<span
										class="shrink-0 font-mono text-xl font-semibold text-foreground tabular-nums print:text-base"
									>
										<span
											class="mr-1 align-middle font-sans text-[10px] font-normal tracking-wide text-muted-foreground uppercase"
											>vol.</span
										>{item.next}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
