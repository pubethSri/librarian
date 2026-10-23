<script lang="ts">
	// Hitlist: what to look for at the fair, one group per publisher (= booth sign,
	// sticky; tap it to jump to another publisher). Order and looks in
	// $lib/field/logic + HitlistRow: watchlist + released (black, blue diamond),
	// released only (black), watchlist (white), ticked off today (faded, last).
	// Swipe a row left = "Bought" sheet. Tag filter; Copy and Save image.
	import { toast } from 'svelte-sonner';
	import { Copy, ImageDown, LoaderCircle, Star, X } from '@lucide/svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import HitlistRow from '$lib/components/field/HitlistRow.svelte';
	import BoughtSheet from '$lib/components/field/BoughtSheet.svelte';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBooksListQuery } from '$lib/queries/books';
	import {
		buildHitlist,
		groupBySeries,
		hitlistCounts,
		hitlistTags,
		hitlistText,
		todayLocal,
		type HitlistItem
	} from '$lib/field/logic';
	import { copyText } from '$lib/field/clipboard';
	import {
		drawHitlist,
		hitlistFileName,
		hitlistImageLines,
		saveHitlistImage
	} from '$lib/field/hitlistImage';
	import { formatDay } from '$lib/console/logic';
	import type { SeriesListItem } from '$lib/types';

	const settings = getFieldSettings();
	const seriesQuery = createSeriesListQuery({ fresh: true });
	const booksQuery = createBooksListQuery({ fresh: true });

	let selectedTags = $state<number[]>([]);
	/** The text, shown for a manual copy when the browser refuses to copy */
	let manualCopy = $state<string | null>(null);

	const loading = $derived(seriesQuery.isPending || booksQuery.isPending);
	const allSeries = $derived(seriesQuery.data ?? []);
	const booksBySeries = $derived(groupBySeries(booksQuery.data ?? []));
	/** The whole list (no tag filter): its size and its tags for the chips */
	const fullList = $derived(buildHitlist(allSeries, booksBySeries));
	const tags = $derived(hitlistTags(fullList));
	const totalSize = $derived(hitlistCounts(fullList).series);
	const groups = $derived(buildHitlist(allSeries, booksBySeries, selectedTags, settings.today));
	const counts = $derived(hitlistCounts(groups));
	const count = $derived(counts.series);

	function toggleTag(id: number) {
		selectedTags = selectedTags.includes(id)
			? selectedTags.filter((t) => t !== id)
			: [...selectedTags, id];
	}

	async function copy() {
		const text = hitlistText(groups);
		if (await copyText(text)) {
			manualCopy = null;
			toast.success(`Copied ${count} series`);
		} else {
			manualCopy = text;
		}
	}

	let savingImage = $state(false);

	async function saveImage() {
		savingImage = true;
		try {
			const today = todayLocal();
			const canvas = drawHitlist(hitlistImageLines(groups, formatDay(today)));
			const how = await saveHitlistImage(canvas, hitlistFileName(today));
			if (how === 'downloaded') toast.success(`Saved ${hitlistFileName(today)}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Couldn't save the image");
		} finally {
			savingImage = false;
		}
	}

	/** The row swiped left: its "Bought" sheet is open */
	let buying = $state<HitlistItem<SeriesListItem> | null>(null);

	// Booth signs: tap one to jump to another publisher's section
	let jumpOpen = $state(false);
	const sectionId = (i: number) => `hitlist-publisher-${i}`;
	function jumpTo(i: number) {
		jumpOpen = false;
		// After the sheet closes, so the page can scroll
		setTimeout(() => document.getElementById(sectionId(i))?.scrollIntoView({ block: 'start' }), 50);
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
					{count}{selectedTags.length > 0 ? ` of ${totalSize}` : ''} series to look for{counts.out >
					0
						? ` · ${counts.out} with volumes out`
						: ''}
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
			onclick={saveImage}
			disabled={loading || count === 0 || savingImage}
			class="flex h-11 items-center gap-1.5 rounded-xl border border-input px-3 text-sm font-medium text-foreground active:bg-accent disabled:opacity-40 print:hidden"
		>
			{#if savingImage}<LoaderCircle class="h-4 w-4 animate-spin" />{:else}<ImageDown
					class="h-4 w-4"
				/>{/if} Save image
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
	{:else if totalSize === 0}
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
			{#each groups as group, gi (group.publisher ?? '')}
				<section id={sectionId(gi)} class="scroll-mt-14 break-inside-avoid">
					<!-- Booth sign: sticks while you're in this publisher; tap to jump -->
					<button
						type="button"
						onclick={() => (jumpOpen = true)}
						aria-label="{group.publisher ?? 'Unknown publisher'}, {group.items
							.length} series — jump to another publisher"
						class="sticky top-12 z-10 -mx-4 mb-2 flex w-[calc(100%+2rem)] items-center gap-2 bg-(--canvas) px-5 py-2 text-left print:static print:mx-0 print:w-full print:px-1 print:py-0 print:pb-1"
					>
						<span class="h-2 w-2 shrink-0 rotate-45 bg-highlight" aria-hidden="true"></span>
						<span
							class="truncate text-[13px] font-semibold tracking-wide text-foreground uppercase print:text-xs print:text-black"
						>
							{group.publisher ?? 'Unknown publisher'}
						</span>
						<span class="shrink-0 text-xs text-muted-foreground">· {group.items.length}</span>
						<span class="h-px min-w-4 flex-1 bg-highlight/40 print:hidden" aria-hidden="true"
						></span>
					</button>
					<ul class="space-y-2 print:space-y-0">
						{#each group.items as item (item.series.id)}
							<li>
								<HitlistRow {item} onbought={() => (buying = item)} />
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
		<p class="mt-4 px-1 text-xs text-muted-foreground print:hidden">
			Swipe a series left when you've bought it. Tap a publisher to jump to another.
		</p>
	{/if}
</div>

<BoughtSheet bind:item={buying} books={booksQuery.data ?? []} />

<Sheet.Root bind:open={jumpOpen}>
	<Sheet.Content side="bottom" class="max-h-[80dvh] gap-0 rounded-t-2xl p-0">
		<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
			<Sheet.Title class="text-base">Jump to a publisher</Sheet.Title>
			<Sheet.Description class="text-xs">{groups.length} publishers on this list</Sheet.Description>
		</Sheet.Header>
		<ul class="overflow-y-auto py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
			{#each groups as group, gi (group.publisher ?? '')}
				<li>
					<button
						type="button"
						onclick={() => jumpTo(gi)}
						class="flex min-h-12 w-full items-center gap-3 px-5 text-left active:bg-accent"
					>
						<span class="h-2 w-2 shrink-0 rotate-45 bg-highlight" aria-hidden="true"></span>
						<span class="min-w-0 flex-1 truncate text-base font-medium"
							>{group.publisher ?? 'Unknown publisher'}</span
						>
						<span class="shrink-0 text-sm text-muted-foreground tabular-nums"
							>{group.items.length}</span
						>
					</button>
				</li>
			{/each}
		</ul>
	</Sheet.Content>
</Sheet.Root>
