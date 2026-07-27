<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createBooksListQuery, createBooksByEventQuery } from '$lib/queries/books';
	import { createBookfairsListQuery, createBookfairDetailQuery } from '$lib/queries/bookfairs';
	import SeriesSearch from '$lib/components/forms/SeriesSearch.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import BooruSearchBar from '$lib/components/BooruSearchBar.svelte';
	import {
		type UnifiedFilterState,
		createEmptyFilterState,
		applyUnifiedFilter
	} from '$lib/components/filterEngine';
	import { parseBooruQuery } from '$lib/utils/booruParser';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Terminal,
		Package,
		Plus,
		X,
		BookOpen,
		Calendar,
		MapPin,
		Pencil,
		ArrowRight,
		Zap
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type {
		SeriesListItem,
		BookListItem,
		StagedBookEntry,
		BookLocation,
		BookSource
	} from '$lib/types';

	// ─── URL Params / Scope ─────────────────────────────────────────────────────
	const urlScope = $page.url.searchParams.get('scope');
	const urlId = $page.url.searchParams.get('id');

	type ScopeType = 'all' | 'bookfair' | 'series';
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
	let stagedEntries = $state<StagedBookEntry[]>([]);

	function removeStaged(tempId: string) {
		stagedEntries = stagedEntries.filter((e) => e.tempId !== tempId);
	}

	function clearAllStaged() {
		stagedEntries = [];
	}

	// ─── Add Books Form ─────────────────────────────────────────────────────────
	let selectedSeriesId = $state<number | null>(
		scopeType === 'series' && scopeId ? scopeId : null
	);
	let selectedSeriesName = $state('');
	let volumeFrom = $state<number>(1);
	let volumeTo = $state<number>(1);
	let batchPrice = $state<string>('');
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

	function handleSeriesSelect(series: SeriesListItem) {
		selectedSeriesId = series.id;
		selectedSeriesName = series.shortName;
		// Auto-set volumeFrom to next volume
		const existingVols = scopedBooks.filter((b) => b.seriesId === series.id);
		const stagedVols = stagedEntries.filter((e) => e.seriesId === series.id);
		const allVols = [
			...existingVols.map((b) => Number(b.volumeNumber)),
			...stagedVols.map((e) => e.volumeNumber)
		];
		const maxVol = allVols.length > 0 ? Math.max(...allVols) : 0;
		volumeFrom = maxVol + 1;
		volumeTo = maxVol + 1;
	}

	function addToPreview() {
		if (!selectedSeriesId) {
			toast.error('Please select a series');
			return;
		}
		if (volumeFrom <= 0 || volumeTo <= 0) {
			toast.error('Volume numbers must be positive');
			return;
		}
		if (volumeTo < volumeFrom) {
			toast.error('End volume must be ≥ start volume');
			return;
		}
		if (volumeTo - volumeFrom > 50) {
			toast.error('Maximum 50 volumes per batch');
			return;
		}

		const defaults = bookfairDefaults;
		const newEntries: StagedBookEntry[] = [];

		for (let v = volumeFrom; v <= volumeTo; v++) {
			// Check for duplicates against existing books
			const existing = scopedBooks.find(
				(b) => b.seriesId === selectedSeriesId && Number(b.volumeNumber) === v
			);
			if (existing) {
				toast.error(`Volume ${v} of "${selectedSeriesName}" already exists`);
				continue;
			}
			// Check for duplicates against already-staged
			const alreadyStaged = stagedEntries.find(
				(e) => e.seriesId === selectedSeriesId && e.volumeNumber === v
			);
			if (alreadyStaged) {
				toast.error(`Volume ${v} of "${selectedSeriesName}" is already staged`);
				continue;
			}

			newEntries.push({
				tempId: crypto.randomUUID(),
				seriesId: selectedSeriesId,
				seriesShortName: selectedSeriesName,
				volumeNumber: v,
				location: defaults?.location ?? 'home',
				source: defaults?.source,
				sourceEventId: defaults?.sourceEventId,
				boughtAt: defaults?.boughtAt,
				price: batchPrice ? Number(batchPrice) : undefined,
				isDraft: false
			});
		}

		if (newEntries.length > 0) {
			stagedEntries = [...stagedEntries, ...newEntries];
			toast.success(`Added ${newEntries.length} volume${newEntries.length > 1 ? 's' : ''} to preview`);
			// Reset volume range for next batch
			volumeFrom = volumeTo + 1;
			volumeTo = volumeFrom;
		}
	}

	// ─── Commit ─────────────────────────────────────────────────────────────────
	let isCommitting = $state(false);

	async function commitAll() {
		if (stagedEntries.length === 0) return;
		isCommitting = true;

		try {
			const payload = stagedEntries.map((e) => ({
				seriesId: e.seriesId,
				volumeNumber: e.volumeNumber,
				location: e.location,
				source: e.source,
				sourceEventId: e.sourceEventId,
				boughtAt: e.boughtAt,
				price: e.price,
				isDraft: e.isDraft
			}));

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
			stagedEntries = [];

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
	type BulkAction = 'location' | 'source' | 'isDraft' | '';
	type ConditionColumn = 'series' | 'location' | 'source' | 'isDraft';
	type ConditionOp = '=' | '!=';
	type Condition = { id: string; column: ConditionColumn; op: ConditionOp; value: string };

	let bulkAction = $state<BulkAction>('');
	let bulkValue = $state<string>('');
	let conditions = $state<Condition[]>([]);
	let showBulkConfirm = $state(false);
	let isBulkExecuting = $state(false);

	function addCondition() {
		conditions = [...conditions, { id: crypto.randomUUID(), column: 'location', op: '=', value: '' }];
	}

	function removeCondition(id: string) {
		conditions = conditions.filter((c) => c.id !== id);
	}

	function resetBulkEdit() {
		bulkAction = '';
		bulkValue = '';
		conditions = [];
	}

	// Get display label for bulk action values
	function getActionLabel(action: BulkAction, value: string): string {
		if (action === 'location') return value === 'home' ? 'Home' : 'Apartment';
		if (action === 'source') {
			if (value === 'bookstore') return 'Bookstore';
			if (value === 'bookfair') return 'Bookfair';
			if (value === 'online') return 'Online';
		}
		if (action === 'isDraft') return value === 'true' ? 'Draft' : 'Not Draft';
		return value;
	}

	// Check if a book matches all conditions
	function matchesConditions(book: BookListItem): boolean {
		if (conditions.length === 0) return true;
		return conditions.every((c) => {
			let bookValue: string;
			switch (c.column) {
				case 'series':
					bookValue = book.seriesShortName.toLowerCase();
					break;
				case 'location':
					bookValue = book.location;
					break;
				case 'source':
					bookValue = book.source || '';
					break;
				case 'isDraft':
					bookValue = String(book.isDraft);
					break;
				default:
					return true;
			}
			const condValue = c.column === 'series' ? c.value.toLowerCase() : c.value;
			if (c.op === '=') return bookValue === condValue;
			if (c.op === '!=') return bookValue !== condValue;
			return true;
		});
	}

	// Affected books: books matching all conditions (only existing, not staged)
	const affectedBooks = $derived.by<BookListItem[]>(() => {
		if (activeTab !== 'edit' || !bulkAction || !bulkValue) return [];
		return scopedBooks.filter((b) => matchesConditions(b));
	});

	const affectedBookIds = $derived.by<Set<string>>(() => {
		return new Set(affectedBooks.map((b) => String(b.id)));
	});

	async function executeBulkEdit() {
		const affected = affectedBooks;
		if (affected.length === 0) return;
		isBulkExecuting = true;

		try {
			const updates: Record<string, unknown> = {};
			if (bulkAction === 'location') updates.location = bulkValue;
			if (bulkAction === 'source') updates.source = bulkValue;
			if (bulkAction === 'isDraft') updates.isDraft = bulkValue === 'true';

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
			resetBulkEdit();

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

	// ─── Helpers ────────────────────────────────────────────────────────────────
	function formatPrice(price: string | number | null | undefined): string {
		if (price === null || price === undefined || price === '') return '—';
		return `฿${Number(price).toLocaleString()}`;
	}

	// Combined preview list: existing + staged
	const previewRows = $derived.by(() => {
		const existing = scopedBooks.map((b) => ({
			type: 'existing' as const,
			id: String(b.id),
			seriesShortName: b.seriesShortName,
			volumeNumber: Number(b.volumeNumber),
			location: b.location,
			source: b.source,
			price: b.price,
			isDraft: b.isDraft,
			seriesTags: b.seriesTags ?? []
		}));
		const staged = stagedEntries.map((e) => ({
			type: 'staged' as const,
			id: e.tempId,
			seriesShortName: e.seriesShortName,
			volumeNumber: e.volumeNumber,
			location: e.location,
			source: e.source ?? null,
			price: e.price != null ? String(e.price) : null,
			isDraft: e.isDraft,
			seriesTags: [] as { id: number; name: string }[]
		}));
		// Sort: series name then volume number
		return [...existing, ...staged].sort((a, b) => {
			const nameCompare = a.seriesShortName.localeCompare(b.seriesShortName);
			if (nameCompare !== 0) return nameCompare;
			return a.volumeNumber - b.volumeNumber;
		});
	});

	// ─── Preview Filter (Booru) ────────────────────────────────────────────────
	let previewFilterState = $state<UnifiedFilterState>(createEmptyFilterState());

	function handlePreviewFilterChange(query: string) {
		const parsed = parseBooruQuery(query);
		previewFilterState.booruQuery = query;
		previewFilterState.searchTerms = parsed.searchTerms;
		previewFilterState.excludeTags = parsed.excludeTags;
		previewFilterState.paramFilters = parsed.params;
	}

	const filteredPreviewRows = $derived.by(() => {
		const rows = previewRows;
		if (!previewFilterState.booruQuery && previewFilterState.paramFilters.length === 0) {
			return rows;
		}

		// Remap param keys for Console preview context:
		// - 'volumes' maps to 'bookCount' in filterEngine, but we have 'volumeNumber'
		// - 'draft' needs to map to 'isDraft'
		const remappedState: UnifiedFilterState = {
			...previewFilterState,
			paramFilters: previewFilterState.paramFilters.map((pf) => {
				if (pf.key === 'volumes') return { ...pf, key: 'volumeNumber' };
				if (pf.key === 'draft') return { ...pf, key: 'isDraft' };
				return pf;
			})
		};

		return rows.filter((row) =>
			applyUnifiedFilter(row as unknown as Record<string, unknown>, remappedState, {
				searchFields: ['seriesShortName'],
				getTagNames: (r) => {
					const typed = r as unknown as { seriesTags: { id: number; name: string }[] };
					return typed.seriesTags?.map((t) => t.name) ?? [];
				}
			})
		);
	});

	const isPreviewFiltered = $derived(
		!!previewFilterState.booruQuery || previewFilterState.paramFilters.length > 0
	);
</script>

<svelte:head>
	<title>Console — Librarian</title>
	<meta name="description" content="Bulk entry and editing workbench." />
</svelte:head>

<div class="flex h-full flex-col gap-0">
	<!-- Scope Bar -->
	<div
		class="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3"
	>
		<Terminal class="h-4 w-4 text-muted-foreground" />
		<div class="flex items-center gap-2">
			<Select.Root
				type="single"
				value={scopeType === 'all' ? 'all' : `${scopeType}:${scopeId}`}
				onValueChange={(val) => {
					if (val === 'all') {
						handleScopeChange('all');
					} else if (typeof val === 'string' && val.startsWith('bookfair:')) {
						handleScopeChange('bookfair', Number(val.split(':')[1]));
					}
				}}
			>
				<Select.Trigger class="w-56">
					{#if scopeType === 'bookfair' && bookfairDetailQuery.data}
						📍 {bookfairDetailQuery.data.name}
					{:else}
						All Books
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all" label="All Books" />
					{#if bookfairsQuery.data}
						<Select.Group>
							<Select.GroupHeading>Bookfairs</Select.GroupHeading>
							{#each bookfairsQuery.data as bf (bf.id)}
								<Select.Item value={`bookfair:${bf.id}`} label={bf.name} />
							{/each}
						</Select.Group>
					{/if}
				</Select.Content>
			</Select.Root>
		</div>

		{#if scopeType === 'bookfair' && bookfairDetailQuery.data}
			{@const bf = bookfairDetailQuery.data}
			<div class="flex items-center gap-3 text-xs text-muted-foreground">
				<span class="flex items-center gap-1">
					<Calendar class="h-3 w-3" />
					{new Date(bf.date + 'T00:00:00').toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})}
				</span>
				{#if bf.location}
					<span class="flex items-center gap-1">
						<MapPin class="h-3 w-3" />
						{bf.location}
					</span>
				{/if}
			</div>
		{/if}
	</div>

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
								{@const isAffected = row.type === 'existing' && affectedBookIds.has(row.id)}
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
										{#if isAffected && bulkAction === 'location' && row.location !== bulkValue}
											<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600">
												<ArrowRight class="h-2.5 w-2.5" />
												<span class="text-xs font-medium">{getActionLabel('location', bulkValue)}</span>
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
												onclick={() => removeStaged(row.id)}
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
			{#if stagedEntries.length > 0 || affectedBooks.length > 0 || isPreviewFiltered}
				<div
					class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5"
				>
					<div class="flex items-center gap-3 text-sm text-muted-foreground">
						{#if stagedEntries.length > 0}
							<span class="flex items-center gap-1">
								<Package class="h-3.5 w-3.5" />
								{stagedEntries.length} new
							</span>
						{/if}
						{#if affectedBooks.length > 0}
							<span class="flex items-center gap-1 text-amber-600">
								<Pencil class="h-3.5 w-3.5" />
								{affectedBooks.length} affected
							</span>
						{/if}
						{#if isPreviewFiltered}
							<span class="text-xs">
								{filteredPreviewRows.length} / {previewRows.length} shown
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						{#if stagedEntries.length > 0}
							<Button
								variant="ghost"
								size="sm"
								class="text-xs text-muted-foreground"
								onclick={clearAllStaged}
							>
								Clear All
							</Button>
							<Button size="sm" class="gap-1.5" onclick={commitAll} disabled={isCommitting}>
								{#if isCommitting}
									Committing...
								{:else}
									Commit All ({stagedEntries.length})
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
					<div class="space-y-5">
						<!-- Bookfair context banner -->
						{#if scopeType === 'bookfair' && bookfairDetailQuery.data}
							<div
								class="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
							>
								<p>
									<span class="font-medium text-foreground">Bookfair mode:</span> Source, location,
									and date are pre-filled from the event.
								</p>
							</div>
						{/if}

						<!-- Series picker -->
						<div class="space-y-2">
							<Label>Series</Label>
							<SeriesSearch value={selectedSeriesId} onselect={handleSeriesSelect} />
						</div>

						<!-- Volume range -->
						<div class="space-y-2">
							<Label>Volumes</Label>
							<div class="flex items-center gap-2">
								<Input
									type="number"
									min="1"
									step="1"
									bind:value={volumeFrom}
									class="h-9 w-20 tabular-nums"
									placeholder="From"
								/>
								<span class="text-sm text-muted-foreground">to</span>
								<Input
									type="number"
									min="1"
									step="1"
									bind:value={volumeTo}
									class="h-9 w-20 tabular-nums"
									placeholder="To"
								/>
								{#if volumeTo > volumeFrom}
									<Badge variant="secondary" class="text-xs">
										{volumeTo - volumeFrom + 1} vols
									</Badge>
								{/if}
							</div>
						</div>

						<!-- Price -->
						<div class="space-y-2">
							<Label for="console-price">Price (each)</Label>
							<Input
								id="console-price"
								type="number"
								step="0.01"
								min="0"
								placeholder="Optional — applies to all"
								bind:value={batchPrice}
								class="h-9"
							/>
						</div>

						<!-- Add button -->
						<Button class="w-full gap-1.5" onclick={addToPreview}>
							<Plus class="h-3.5 w-3.5" />
							Add to Preview
						</Button>
					</div>
				</Tabs.Content>

				<Tabs.Content value="edit" class="flex-1 overflow-auto p-4">
					<div class="space-y-5">
						<!-- Action selector -->
						<div class="space-y-2">
							<Label>Action</Label>
							<Select.Root type="single" bind:value={bulkAction} onValueChange={() => { bulkValue = ''; }}>
								<Select.Trigger class="w-full">
									{#if bulkAction === 'location'}
										Change location to
									{:else if bulkAction === 'source'}
										Set source to
									{:else if bulkAction === 'isDraft'}
										Set draft status
									{:else}
										Select action...
									{/if}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="location" label="Change location to" />
									<Select.Item value="source" label="Set source to" />
									<Select.Item value="isDraft" label="Set draft status" />
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Value selector (contextual) -->
						{#if bulkAction}
							<div class="space-y-2">
								<Label>Value</Label>
								{#if bulkAction === 'location'}
									<Select.Root type="single" bind:value={bulkValue}>
										<Select.Trigger class="w-full">
											{bulkValue === 'home' ? 'Home' : bulkValue === 'apartment' ? 'Apartment' : 'Select...'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="home" label="Home" />
											<Select.Item value="apartment" label="Apartment" />
										</Select.Content>
									</Select.Root>
								{:else if bulkAction === 'source'}
									<Select.Root type="single" bind:value={bulkValue}>
										<Select.Trigger class="w-full">
											{bulkValue === 'bookstore' ? 'Bookstore' : bulkValue === 'bookfair' ? 'Bookfair' : bulkValue === 'online' ? 'Online' : 'Select...'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="bookstore" label="Bookstore" />
											<Select.Item value="bookfair" label="Bookfair" />
											<Select.Item value="online" label="Online" />
										</Select.Content>
									</Select.Root>
								{:else if bulkAction === 'isDraft'}
									<Select.Root type="single" bind:value={bulkValue}>
										<Select.Trigger class="w-full">
											{bulkValue === 'true' ? 'Draft' : bulkValue === 'false' ? 'Not Draft' : 'Select...'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="true" label="Draft" />
											<Select.Item value="false" label="Not Draft" />
										</Select.Content>
									</Select.Root>
								{/if}
							</div>
						{/if}

						<!-- Conditions -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label>Conditions</Label>
								<Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={addCondition}>
									<Plus class="h-3 w-3" />
									Add
								</Button>
							</div>

							{#if conditions.length === 0}
								<p class="text-xs text-muted-foreground">No conditions — all books in scope will be affected.</p>
							{:else}
								<div class="space-y-2">
									{#each conditions as cond, i (cond.id)}
										<div class="flex items-center gap-1.5">
											<span class="text-xs text-muted-foreground w-10 shrink-0">{i === 0 ? 'WHERE' : 'AND'}</span>
											<Select.Root type="single" bind:value={cond.column}>
												<Select.Trigger class="h-8 text-xs flex-1">
													{cond.column}
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="series" label="series" />
													<Select.Item value="location" label="location" />
													<Select.Item value="source" label="source" />
													<Select.Item value="isDraft" label="isDraft" />
												</Select.Content>
											</Select.Root>
											<Select.Root type="single" bind:value={cond.op}>
												<Select.Trigger class="h-8 text-xs w-14">
													{cond.op}
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="=" label="=" />
													<Select.Item value="!=" label="!=" />
												</Select.Content>
											</Select.Root>
											{#if cond.column === 'location'}
												<Select.Root type="single" bind:value={cond.value}>
													<Select.Trigger class="h-8 text-xs flex-1">
														{cond.value || 'value...'}
													</Select.Trigger>
													<Select.Content>
														<Select.Item value="home" label="home" />
														<Select.Item value="apartment" label="apartment" />
													</Select.Content>
												</Select.Root>
											{:else if cond.column === 'source'}
												<Select.Root type="single" bind:value={cond.value}>
													<Select.Trigger class="h-8 text-xs flex-1">
														{cond.value || 'value...'}
													</Select.Trigger>
													<Select.Content>
														<Select.Item value="bookstore" label="bookstore" />
														<Select.Item value="bookfair" label="bookfair" />
														<Select.Item value="online" label="online" />
													</Select.Content>
												</Select.Root>
											{:else if cond.column === 'isDraft'}
												<Select.Root type="single" bind:value={cond.value}>
													<Select.Trigger class="h-8 text-xs flex-1">
														{cond.value || 'value...'}
													</Select.Trigger>
													<Select.Content>
														<Select.Item value="true" label="true" />
														<Select.Item value="false" label="false" />
													</Select.Content>
												</Select.Root>
											{:else}
												<Input
													class="h-8 text-xs flex-1"
													placeholder="value..."
													bind:value={cond.value}
												/>
											{/if}
											<button
												class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												onclick={() => removeCondition(cond.id)}
											>
												<X class="h-3 w-3" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Affected summary + Execute -->
						{#if bulkAction && bulkValue}
							<div class="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
								<p class="text-sm">
									<span class="font-medium text-amber-600">{affectedBooks.length}</span>
									<span class="text-muted-foreground"> book{affectedBooks.length !== 1 ? 's' : ''} will be updated</span>
								</p>
							</div>

							<div class="flex gap-2">
								<Button
									variant="outline"
									class="flex-1 text-xs"
									onclick={resetBulkEdit}
								>
									Reset
								</Button>
								<Button
									class="flex-1 gap-1.5"
									disabled={affectedBooks.length === 0}
									onclick={() => (showBulkConfirm = true)}
								>
									<Zap class="h-3.5 w-3.5" />
									Execute
								</Button>
							</div>
						{/if}
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>

<!-- Bulk Edit Confirm Dialog -->
<DeleteConfirmDialog
	bind:open={showBulkConfirm}
	title="Confirm Bulk Edit"
	description={`Apply "${bulkAction === 'location' ? 'Change location' : bulkAction === 'source' ? 'Set source' : 'Set draft status'}" to ${affectedBooks.length} book${affectedBooks.length !== 1 ? 's' : ''}? This cannot be undone.`}
	loading={isBulkExecuting}
	onconfirm={executeBulkEdit}
	oncancel={() => (showBulkConfirm = false)}
/>
