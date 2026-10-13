<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BooruSearchBar from '$lib/components/BooruSearchBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import { Package, X, BookOpen, Pencil, ArrowRight } from '@lucide/svelte';
	import { type UnifiedFilterState, createEmptyFilterState } from '$lib/components/filterEngine';
	import { parseBooruQuery } from '$lib/utils/booruParser';
	import {
		buildPreviewRows,
		filterPreviewRows,
		formatPrice,
		getActionLabel,
		isFilterActive
	} from '$lib/console/logic';
	import type { StagingStore } from '$lib/console/staging.svelte';
	import type { BulkEditStore } from '$lib/console/bulkEdit.svelte';
	import type { BookListItem } from '$lib/types';
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
</script>

<div class="flex flex-1 flex-col border-r border-border" style="flex-basis: 58%;">
	<!-- Preview filter bar -->
	<div class="border-b border-border px-3 py-2">
		<BooruSearchBar
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
						<Table.Head class="w-10"></Table.Head>
						<Table.Head>Series</Table.Head>
						<Table.Head class="w-16 text-center">Vol.</Table.Head>
						<Table.Head class="w-24">Location</Table.Head>
						<Table.Head class="w-24 text-right">Price</Table.Head>
						<Table.Head class="w-10"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredPreviewRows as row (row.id)}
						{@const isAffected = row.type === 'existing' && bulk.affectedBookIds.has(row.id)}
						<Table.Row
							class={row.type === 'staged'
								? 'border-l-2 border-l-green-600/60 bg-green-500/5'
								: isAffected
									? 'border-l-2 border-l-amber-500/60 bg-amber-500/5'
									: ''}
						>
							<Table.Cell class="py-2">
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
							</Table.Cell>
							<Table.Cell class="py-2 text-center text-sm tabular-nums">
								{row.volumeNumber}
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
							<Table.Cell class="py-2 text-right text-sm tabular-nums">
								{formatPrice(row.price)}
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

	<!-- Bottom bar -->
	{#if staging.entries.length > 0 || bulk.affectedBooks.length > 0 || isPreviewFiltered}
		<div class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
			<div class="flex items-center gap-3 text-sm text-muted-foreground">
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
				{#if isPreviewFiltered}
					<span class="text-xs">
						{filteredPreviewRows.length} / {previewRows.length} shown
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
