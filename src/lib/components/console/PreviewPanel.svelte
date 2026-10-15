<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BooruSearchBar from '$lib/components/BooruSearchBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ExtraBadge from '$lib/components/ExtraBadge.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import { Package, X, BookOpen, Pencil, ArrowRight, Check } from '@lucide/svelte';
	import { type UnifiedFilterState, createEmptyFilterState } from '$lib/components/filterEngine';
	import { parseBooruQuery } from '$lib/utils/booruParser';
	import {
		buildPreviewRows,
		filterPreviewRows,
		formatDay,
		formatPrice,
		getActionLabel,
		dayOf,
		pendingPurchaseDay,
		isFilterActive,
		rangeIds
	} from '$lib/console/logic';
	import { createTagsListQuery } from '$lib/queries/tags';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import type { StagingStore } from '$lib/console/staging.svelte';
	import type { BulkEditStore } from '$lib/console/bulkEdit.svelte';
	import { READING_STATUS_LABELS, type BookListItem } from '$lib/types';
	import type { SeriesMeta } from '$lib/console/types';

	let {
		books,
		seriesById,
		isLoading,
		staging,
		bulk,
		isCommitting,
		oncommit
	}: {
		/** Books in the current scope */
		books: BookListItem[];
		seriesById: Map<number, SeriesMeta>;
		isLoading: boolean;
		staging: StagingStore;
		bulk: BulkEditStore;
		isCommitting: boolean;
		oncommit: () => void;
	} = $props();

	// Combined preview list: existing + staged
	const previewRows = $derived.by(() => buildPreviewRows(books, staging.entries, seriesById));

	// ─── Preview Filter (Booru) ────────────────────────────────────────────────
	// NOTE: `booruQuery` has two write paths — BooruSearchBar's bind:value fires
	// on every keystroke, while onchange re-parses after a debounce. The lag
	// between them is observable (clearing the box briefly keeps the old
	// params), so both are kept as-is rather than collapsed.
	let previewFilterState = $state<UnifiedFilterState>(createEmptyFilterState());

	function handlePreviewFilterChange(query: string) {
		const parsed = parseBooruQuery(query);
		previewFilterState.booruQuery = query;
		previewFilterState.searchTerms = parsed.searchTerms;
		previewFilterState.excludeTags = parsed.excludeTags;
		previewFilterState.paramFilters = parsed.params;
	}

	const filteredPreviewRows = $derived.by(() => filterPreviewRows(previewRows, previewFilterState));

	const isPreviewFiltered = $derived(isFilterActive(previewFilterState));

	// ─── Filter autocomplete values ────────────────────────────────────────────
	const tagsQuery = createTagsListQuery();
	const seriesQuery = createSeriesListQuery();
	const bookfairsQuery = createBookfairsListQuery();
	/** The fair a pending "Link to bookfair" points at, for the old→new arrow */
	const linkFair = $derived(
		bulk.action === 'bookfair'
			? bookfairsQuery.data?.find((bf) => String(bf.id) === bulk.value)
			: undefined
	);
	/** The purchase day a pending edit would set (undefined: dates untouched) */
	const newDay = $derived(
		pendingPurchaseDay(bulk.action, bulk.value, {
			fairDate: bulk.setFairDate ? linkFair?.date : null
		})
	);
	const valueSuggestions = $derived<Record<string, string[]>>({
		'tag:': (tagsQuery.data ?? []).map((t) => t.name),
		'publisher:': [
			...new Set((seriesQuery.data ?? []).map((s) => s.publisher).filter((p): p is string => !!p))
		].sort(),
		'name:': (seriesQuery.data ?? []).map((s) => s.shortName).sort()
	});

	// ─── Row selection (Bulk Edit tab only) ────────────────────────────────────
	// Click toggles a row; Shift+click adds the range from the last clicked row.
	// The anchor is an id, not an index, so it survives the filter changing.
	let anchorId = $state<string | null>(null);

	function handleRowClick(e: MouseEvent, index: number) {
		if (!bulk.isActive) return;
		const row = filteredPreviewRows[index];
		if (row.type !== 'existing') return;
		const anchorIndex = anchorId ? filteredPreviewRows.findIndex((r) => r.id === anchorId) : -1;
		if (e.shiftKey && anchorIndex >= 0) {
			bulk.addSelected(rangeIds(filteredPreviewRows, anchorIndex, index));
		} else {
			bulk.toggleSelected(row.id);
		}
		anchorId = row.id;
	}

	const visibleSelectableIds = $derived(
		filteredPreviewRows.filter((r) => r.type === 'existing').map((r) => r.id)
	);
	const allVisibleSelected = $derived(
		visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => bulk.selectedIds.has(id))
	);

	function toggleAllVisible() {
		if (allVisibleSelected) bulk.removeSelected(visibleSelectableIds);
		else bulk.addSelected(visibleSelectableIds);
	}
</script>

<div class="flex flex-1 flex-col border-r border-border" style="flex-basis: 58%;">
	<!-- Preview filter bar -->
	<div class="border-b border-border px-3 py-2">
		<BooruSearchBar
			allTags={tagsQuery.data ?? []}
			{valueSuggestions}
			bind:value={previewFilterState.booruQuery}
			placeholder="Filter preview... e.g. name:isekai location:home"
			onchange={handlePreviewFilterChange}
		/>
	</div>
	<div class="flex-1 overflow-auto">
		{#if isLoading}
			<div class="space-y-2 p-4">
				{#each Array(5) as _, i (i)}
					<Skeleton class="h-10 w-full" />
				{/each}
			</div>
		{:else if previewRows.length === 0}
			<div class="flex h-full items-center justify-center p-8">
				<EmptyState
					icon={BookOpen}
					title="No books in scope"
					description="Use the Add Books tab to stage new entries."
				/>
			</div>
		{:else if filteredPreviewRows.length === 0}
			<div class="flex h-full items-center justify-center p-8">
				<EmptyState
					icon={BookOpen}
					title="No matching books"
					description="Try a different filter query."
				/>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-16">
							{#if bulk.isActive}
								<!-- Drawn, not a native checkbox, so it ignores the page color-scheme -->
								<button
									role="checkbox"
									aria-checked={allVisibleSelected}
									aria-label="Select all visible rows"
									title="Select all visible rows"
									class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border align-middle {allVisibleSelected
										? 'border-sky-600 bg-sky-600 text-white'
										: 'border-input bg-background'}"
									onclick={toggleAllVisible}
								>
									{#if allVisibleSelected}<Check class="h-2.5 w-2.5" />{/if}
								</button>
							{/if}
						</Table.Head>
						<Table.Head>Series</Table.Head>
						<Table.Head class="w-16 text-center">Vol.</Table.Head>
						<Table.Head class="w-24">Location</Table.Head>
						<Table.Head class="w-24">Reading</Table.Head>
						<Table.Head class="w-28">Purchased</Table.Head>
						<Table.Head class="w-24 text-right">Price</Table.Head>
						<Table.Head class="w-10"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredPreviewRows as row, index (row.id)}
						{@const isAffected = row.type === 'existing' && bulk.affectedBookIds.has(row.id)}
						{@const isSelectable = bulk.isActive && row.type === 'existing'}
						{@const isSelected = isSelectable && bulk.selectedIds.has(row.id)}
						<Table.Row
							class="{row.type === 'staged'
								? 'border-l-2 border-l-green-600/60 bg-green-500/5'
								: isAffected
									? 'border-l-2 border-l-amber-500/60 bg-amber-500/5'
									: isSelected
										? 'border-l-2 border-l-sky-500/60 bg-sky-500/5'
										: ''} {isSelectable ? 'cursor-pointer select-none' : ''}"
							onclick={(e: MouseEvent) => handleRowClick(e, index)}
						>
							<Table.Cell class="py-2">
								{#if isSelectable}
									<!-- Display only: the row's click handler does the toggling -->
									<span
										aria-hidden="true"
										class="mr-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border align-middle {isSelected
											? 'border-sky-600 bg-sky-600 text-white'
											: 'border-input bg-background'}"
									>
										{#if isSelected}<Check class="h-2.5 w-2.5" />{/if}
									</span>
								{/if}
								{#if row.type === 'staged'}
									<Badge
										variant="outline"
										class="border-green-600/40 bg-green-500/10 px-1 py-0 text-[10px] text-green-600"
									>
										NEW
									</Badge>
								{:else if isAffected}
									<Badge
										variant="outline"
										class="border-amber-500/40 bg-amber-500/10 px-1 py-0 text-[10px] text-amber-600"
									>
										EDIT
									</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2">
								<span
									class="text-sm font-medium {row.type === 'staged'
										? 'text-green-700 dark:text-green-400'
										: 'text-foreground'}"
								>
									{row.seriesShortName}
								</span>
								{#if row.isDraft}
									<Badge variant="outline" class="ml-1 text-[10px]">Draft</Badge>
								{/if}
								{#if isAffected && linkFair && row.sourceEventId !== linkFair.id}
									<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
										<ArrowRight class="h-2.5 w-2.5" />
										<span class="text-xs font-medium">📍 {linkFair.name}</span>
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2 text-center text-sm tabular-nums">
								{#if row.isExtra}<ExtraBadge book={row} />{:else}{row.volumeNumber}{/if}
							</Table.Cell>
							<Table.Cell class="py-2 text-sm text-muted-foreground">
								{row.location === 'home' ? 'Home' : 'Apartment'}
								{#if isAffected && bulk.action === 'location' && row.location !== bulk.value}
									<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
										<ArrowRight class="h-2.5 w-2.5" />
										<span class="text-xs font-medium">{getActionLabel('location', bulk.value)}</span
										>
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2 text-sm text-muted-foreground">
								{READING_STATUS_LABELS[row.readingStatus]}
								{#if isAffected && bulk.action === 'readingStatus' && row.readingStatus !== bulk.value && !(row.readingStatus === 'read' && bulk.value === 'reading')}
									<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
										<ArrowRight class="h-2.5 w-2.5" />
										<span class="text-xs font-medium"
											>{getActionLabel('readingStatus', bulk.value)}</span
										>
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
								{formatDay(row.boughtAt)}
								{#if isAffected && newDay !== undefined && dayOf(row.boughtAt) !== newDay}
									<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
										<ArrowRight class="h-2.5 w-2.5" />
										<span class="text-xs font-medium">{newDay ? formatDay(newDay) : 'Unknown'}</span
										>
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2 text-right text-sm tabular-nums">
								{formatPrice(row.price)}
								{#if isAffected && bulk.action === 'price' && Number(row.price) !== Number(bulk.value)}
									<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
										<ArrowRight class="h-2.5 w-2.5" />
										<span class="text-xs font-medium">{getActionLabel('price', bulk.value)}</span>
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-2">
								{#if row.type === 'staged'}
									<button
										class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										onclick={() => staging.remove(row.id)}
										title="Remove"
									>
										<X class="h-3.5 w-3.5" />
									</button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</div>

	<!-- Bottom bar — always shown, so the count is visible whatever the list length -->
	{#if !isLoading}
		<div class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
			<div class="flex items-center gap-3 text-sm text-muted-foreground">
				<span class="text-xs tabular-nums">
					{#if isPreviewFiltered}
						{filteredPreviewRows.length} / {previewRows.length} shown
					{:else}
						{previewRows.length} book{previewRows.length !== 1 ? 's' : ''}
					{/if}
				</span>
				{#if staging.entries.length > 0}
					<span class="flex items-center gap-1">
						<Package class="h-3.5 w-3.5" />
						{staging.entries.length} new
					</span>
				{/if}
				{#if bulk.affectedBooks.length > 0}
					<span class="flex items-center gap-1 text-amber-600">
						<Pencil class="h-3.5 w-3.5" />
						{bulk.affectedBooks.length} affected
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if staging.entries.length > 0}
					<Button
						variant="ghost"
						size="sm"
						class="text-xs text-muted-foreground"
						onclick={() => staging.clear()}
					>
						Clear All
					</Button>
					<Button size="sm" class="gap-1.5" onclick={oncommit} disabled={isCommitting}>
						{#if isCommitting}
							Committing...
						{:else}
							Commit All ({staging.entries.length})
						{/if}
					</Button>
				{/if}
			</div>
		</div>
	{/if}
</div>
