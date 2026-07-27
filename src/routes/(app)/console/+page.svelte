<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createBooksListQuery, createBooksByEventQuery } from '$lib/queries/books';
	import { createBookfairsListQuery, createBookfairDetailQuery } from '$lib/queries/bookfairs';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import BooruSearchBar from '$lib/components/BooruSearchBar.svelte';
	import ScopeBar from '$lib/components/console/ScopeBar.svelte';
	import BulkEditPanel from '$lib/components/console/BulkEditPanel.svelte';
	import AddBooksPanel from '$lib/components/console/AddBooksPanel.svelte';
	import { type UnifiedFilterState, createEmptyFilterState } from '$lib/components/filterEngine';
	import {
		buildPreviewRows,
		filterPreviewRows,
		formatPrice,
		getActionLabel,
		isFilterActive,
		toBatchPayload,
		toBulkUpdates
	} from '$lib/console/logic';
	import { createStagingStore } from '$lib/console/staging.svelte';
	import { createBulkEditStore } from '$lib/console/bulkEdit.svelte';
	import { parseBooruQuery } from '$lib/utils/booruParser';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Package, X, BookOpen, Pencil, ArrowRight } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { BookListItem, BookLocation, BookSource } from '$lib/types';
	import type { ScopeType } from '$lib/console/types';

	// ─── URL Params / Scope ─────────────────────────────────────────────────────
	const urlScope = $page.url.searchParams.get('scope');
	const urlId = $page.url.searchParams.get('id');

	let scopeType = $state<ScopeType>(
		urlScope === 'bookfair' ? 'bookfair' : urlScope === 'series' ? 'series' : 'all'
	);
	let scopeId = $state<number | null>(urlId ? Number(urlId) : null);

	// ─── Queries ────────────────────────────────────────────────────────────────
	const allBooksQuery = createBooksListQuery();
	const bookfairsQuery = createBookfairsListQuery();

	// Bookfair detail query for scope info
	const bookfairDetailId = $derived(scopeType === 'bookfair' && scopeId ? scopeId : 0);
	const bookfairDetailQuery = createBookfairDetailQuery(bookfairDetailId);
	const eventBooksQuery = createBooksByEventQuery(bookfairDetailId);

	// ─── Scoped Books ───────────────────────────────────────────────────────────
	const scopedBooks = $derived.by<BookListItem[]>(() => {
		if (scopeType === 'bookfair' && scopeId) {
			return eventBooksQuery.data ?? [];
		}
		if (scopeType === 'series' && scopeId) {
			return (allBooksQuery.data ?? []).filter((b) => b.seriesId === scopeId);
		}
		return allBooksQuery.data ?? [];
	});

	const isLoading = $derived(
		scopeType === 'bookfair' && scopeId
			? eventBooksQuery.isPending
			: allBooksQuery.isPending
	);

	// ─── Staged Entries ─────────────────────────────────────────────────────────
	const staging = createStagingStore();

	// ─── Add Books Form ─────────────────────────────────────────────────────────
	// Seeds the panel's series picker from a `?scope=series&id=` deep link. Read
	// once, before any scope change, so the panel keeps the original behavior of
	// not resyncing when the scope changes later.
	const initialSeriesId = untrack(() => (scopeType === 'series' && scopeId ? scopeId : null));
	let activeTab = $state('add');

	// Bookfair scope defaults
	const bookfairDefaults = $derived.by(() => {
		if (scopeType !== 'bookfair' || !bookfairDetailQuery.data) return null;
		const bf = bookfairDetailQuery.data;
		return {
			source: 'bookfair' as BookSource,
			sourceEventId: bf.id,
			location: 'apartment' as BookLocation,
			boughtAt: bf.date
		};
	});

	// ─── Commit ─────────────────────────────────────────────────────────────────
	let isCommitting = $state(false);

	async function commitAll() {
		if (staging.entries.length === 0) return;
		isCommitting = true;

		try {
			const payload = toBatchPayload(staging.entries);

			const res = await fetch('/api/books/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ books: payload })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to create books');
			}

			const result = await res.json();
			toast.success(`Created ${result.created} book${result.created > 1 ? 's' : ''}`);
			staging.clear();

			// Refetch scoped data
			if (scopeType === 'bookfair' && scopeId) {
				eventBooksQuery.refetch();
				bookfairDetailQuery.refetch();
			}
			allBooksQuery.refetch();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Commit failed');
		} finally {
			isCommitting = false;
		}
	}

	// ─── Scope Change ───────────────────────────────────────────────────────────
	function handleScopeChange(type: ScopeType, id: number | null = null) {
		scopeType = type;
		scopeId = id;
		// Update URL without navigation
		const url = new URL($page.url);
		if (type === 'all') {
			url.searchParams.delete('scope');
			url.searchParams.delete('id');
		} else {
			url.searchParams.set('scope', type);
			if (id) url.searchParams.set('id', String(id));
		}
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	// ─── Bulk Edit ──────────────────────────────────────────────────────────────
	const bulk = createBulkEditStore(
		() => scopedBooks,
		() => activeTab === 'edit'
	);

	let showBulkConfirm = $state(false);
	let isBulkExecuting = $state(false);

	async function executeBulkEdit() {
		const affected = bulk.affectedBooks;
		if (affected.length === 0) return;
		isBulkExecuting = true;

		try {
			const updates = toBulkUpdates(bulk.action, bulk.value);

			const res = await fetch('/api/books/bulk', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookIds: affected.map((b) => b.id),
					updates
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Bulk update failed');
			}

			const result = await res.json();
			toast.success(`Updated ${result.updated} book${result.updated > 1 ? 's' : ''}`);
			bulk.reset();

			// Refetch data
			if (scopeType === 'bookfair' && scopeId) {
				eventBooksQuery.refetch();
				bookfairDetailQuery.refetch();
			}
			allBooksQuery.refetch();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Bulk update failed');
		} finally {
			isBulkExecuting = false;
			showBulkConfirm = false;
		}
	}

	// Combined preview list: existing + staged
	const previewRows = $derived.by(() => buildPreviewRows(scopedBooks, staging.entries));

	// ─── Preview Filter (Booru) ────────────────────────────────────────────────
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

<svelte:head>
	<title>Console — Librarian</title>
	<meta name="description" content="Bulk entry and editing workbench." />
</svelte:head>

<div class="flex h-full flex-col gap-0">
	<!-- Scope Bar -->
	<ScopeBar
		{scopeType}
		{scopeId}
		bookfair={bookfairDetailQuery.data}
		bookfairs={bookfairsQuery.data}
		onscopechange={handleScopeChange}
	/>

	<!-- Two-Panel Layout -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Preview Panel (left) -->
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
						{#each Array(5) as _}
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
												class="border-green-600/40 bg-green-500/10 text-green-600 text-[10px] px-1 py-0"
											>
												NEW
											</Badge>
										{:else if isAffected}
											<Badge
												variant="outline"
												class="border-amber-500/40 bg-amber-500/10 text-amber-600 text-[10px] px-1 py-0"
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
									<Table.Cell class="py-2 text-center tabular-nums text-sm">
										{row.volumeNumber}
									</Table.Cell>
									<Table.Cell class="py-2 text-sm text-muted-foreground">
										{row.location === 'home' ? 'Home' : 'Apartment'}
										{#if isAffected && bulk.action === 'location' && row.location !== bulk.value}
											<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
												<ArrowRight class="h-2.5 w-2.5" />
												<span class="text-xs font-medium">{getActionLabel('location', bulk.value)}</span>
											</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="py-2 text-right tabular-nums text-sm">
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
				<div
					class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5"
				>
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
							<Button size="sm" class="gap-1.5" onclick={commitAll} disabled={isCommitting}>
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

		<!-- Command Panel (right) -->
		<div class="flex flex-col overflow-auto" style="flex-basis: 42%;">
			<Tabs.Root bind:value={activeTab} class="flex flex-col h-full">
				<div class="border-b border-border px-4">
					<Tabs.List class="w-full">
						<Tabs.Trigger value="add" class="flex-1">Add Books</Tabs.Trigger>
						<Tabs.Trigger value="edit" class="flex-1">Bulk Edit</Tabs.Trigger>
					</Tabs.List>
				</div>

				<Tabs.Content value="add" class="flex-1 overflow-auto p-4">
					<AddBooksPanel
						books={scopedBooks}
						{staging}
						defaults={bookfairDefaults}
						initialSeriesId={initialSeriesId}
					/>
				</Tabs.Content>

				<Tabs.Content value="edit" class="flex-1 overflow-auto p-4">
					<BulkEditPanel {bulk} onexecute={() => (showBulkConfirm = true)} />
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>

<!-- Bulk Edit Confirm Dialog -->
<DeleteConfirmDialog
	bind:open={showBulkConfirm}
	title="Confirm Bulk Edit"
	description={`Apply "${bulk.action === 'location' ? 'Change location' : bulk.action === 'source' ? 'Set source' : 'Set draft status'}" to ${bulk.affectedBooks.length} book${bulk.affectedBooks.length !== 1 ? 's' : ''}? This cannot be undone.`}
	loading={isBulkExecuting}
	onconfirm={executeBulkEdit}
	oncancel={() => (showBulkConfirm = false)}
/>
