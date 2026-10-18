<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createBooksListQuery, createBooksByEventQuery } from '$lib/queries/books';
	import { createBookfairsListQuery, createBookfairDetailQuery } from '$lib/queries/bookfairs';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBatchBookMutation } from '$lib/queries/batch';
	import { createBulkBookUpdateMutation } from '$lib/queries/bulk';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import ScopeBar from '$lib/components/console/ScopeBar.svelte';
	import PreviewPanel from '$lib/components/console/PreviewPanel.svelte';
	import BulkEditPanel from '$lib/components/console/BulkEditPanel.svelte';
	import AddBooksPanel from '$lib/components/console/AddBooksPanel.svelte';
	import { bulkConfirmText, toBatchPayload, toBulkUpdates } from '$lib/console/logic';
	import { createStagingStore } from '$lib/console/staging.svelte';
	import { createBulkEditStore } from '$lib/console/bulkEdit.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import type { BookListItem, BookSource } from '$lib/types';
	import type { ScopeType, SeriesMeta } from '$lib/console/types';

	// ─── URL Params / Scope ─────────────────────────────────────────────────────
	const urlScope = $page.url.searchParams.get('scope');
	const urlId = $page.url.searchParams.get('id');

	let scopeType = $state<ScopeType>(
		urlScope === 'bookfair' ? 'bookfair' : urlScope === 'series' ? 'series' : 'all'
	);
	let scopeId = $state<number | null>(urlId ? Number(urlId) : null);
	// `?link=<bookfairId>` — from a bookfair's "Add books from your collection":
	// open Bulk Edit with "Link to bookfair" pre-set, over All Books
	const urlLink = $page.url.searchParams.get('link');

	// ─── Queries ────────────────────────────────────────────────────────────────
	const allBooksQuery = createBooksListQuery();
	const bookfairsQuery = createBookfairsListQuery();
	const seriesQuery = createSeriesListQuery();

	// Series fields for the preview filter (publisher/status/type, staged-row tags)
	const seriesById = $derived(
		new Map<number, SeriesMeta>((seriesQuery.data ?? []).map((s) => [s.id, s]))
	);

	// Bookfair detail query for scope info
	const bookfairDetailId = $derived(scopeType === 'bookfair' && scopeId ? scopeId : 0);
	const bookfairDetailQuery = createBookfairDetailQuery(() => bookfairDetailId);
	const eventBooksQuery = createBooksByEventQuery(() => bookfairDetailId);

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
		scopeType === 'bookfair' && scopeId ? eventBooksQuery.isPending : allBooksQuery.isPending
	);

	// ─── Staged Entries ─────────────────────────────────────────────────────────
	const staging = createStagingStore();

	// ─── Add Books Form ─────────────────────────────────────────────────────────
	// Seeds the panel's series picker from a `?scope=series&id=` deep link. Read
	// once, before any scope change, so the panel keeps the original behavior of
	// not resyncing when the scope changes later.
	const initialSeriesId = untrack(() => (scopeType === 'series' && scopeId ? scopeId : null));
	let activeTab = $state(urlLink ? 'edit' : 'add');

	// Bookfair scope defaults
	const bookfairDefaults = $derived.by(() => {
		if (scopeType !== 'bookfair' || !bookfairDetailQuery.data) return null;
		const bf = bookfairDetailQuery.data;
		return {
			source: 'bookfair' as BookSource,
			sourceEventId: bf.id,
			boughtAt: bf.date
		};
	});

	// ─── Commit ─────────────────────────────────────────────────────────────────
	// The hook invalidates ['books'], ['series'] and ['bookfairs'], which by
	// prefix covers the scoped event-books and bookfair-detail queries too.
	const batchMutation = createBatchBookMutation();

	async function commitAll() {
		if (staging.entries.length === 0) return;

		try {
			const result = await batchMutation.mutateAsync({ books: toBatchPayload(staging.entries) });
			toast.success(`Created ${result.created} book${result.created > 1 ? 's' : ''}`);
			staging.clear();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Commit failed');
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
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- derived from page.url, which already includes the base path
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	// ─── Bulk Edit ──────────────────────────────────────────────────────────────
	const bulk = createBulkEditStore(
		() => scopedBooks,
		() => activeTab === 'edit'
	);

	if (urlLink) {
		bulk.action = 'bookfair';
		bulk.value = urlLink;
	}

	let showBulkConfirm = $state(false);
	const bulkMutation = createBulkBookUpdateMutation();

	/** The fair a "Link to bookfair" edit targets */
	const linkFair = $derived(
		bulk.action === 'bookfair'
			? bookfairsQuery.data?.find((bf) => String(bf.id) === bulk.value)
			: undefined
	);

	async function executeBulkEdit() {
		const affected = bulk.affectedBooks;
		if (affected.length === 0) return;

		try {
			const result = await bulkMutation.mutateAsync({
				bookIds: affected.map((b) => b.id),
				updates: toBulkUpdates(bulk.action, bulk.value, {
					fairDate: bulk.setFairDate ? linkFair?.date : null
				})
			});
			toast.success(`Updated ${result.updated} book${result.updated > 1 ? 's' : ''}`);
			bulk.reset();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Bulk update failed');
		} finally {
			showBulkConfirm = false;
		}
	}
</script>

<svelte:head>
	<title>Console — Librarian</title>
	<meta name="description" content="Bulk entry and editing workbench." />
</svelte:head>

<!--
	Bounded to the viewport (minus the 3rem header and the layout's vertical
	padding) so the two panels scroll independently and the preview's commit
	bar stays on screen however long the list is.
-->
<div
	class="flex h-[calc(100dvh-6rem)] flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card md:h-[calc(100dvh-7rem)]"
>
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
		<PreviewPanel
			books={scopedBooks}
			{seriesById}
			{isLoading}
			{staging}
			{bulk}
			isCommitting={batchMutation.isPending}
			oncommit={commitAll}
		/>

		<!-- Command Panel (right) -->
		<div class="flex flex-col overflow-auto" style="flex-basis: 42%;">
			<Tabs.Root bind:value={activeTab} class="flex h-full flex-col">
				<div class="border-b border-border px-4">
					<Tabs.List class="w-full">
						<Tabs.Trigger value="add" class="flex-1">Add Books</Tabs.Trigger>
						<Tabs.Trigger value="edit" class="flex-1">Bulk Edit</Tabs.Trigger>
					</Tabs.List>
				</div>

				<Tabs.Content value="add" class="flex-1 overflow-auto p-4">
					<AddBooksPanel
						ownedBooks={allBooksQuery.data ?? []}
						{staging}
						defaults={bookfairDefaults}
						{initialSeriesId}
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
	description={bulkConfirmText(bulk.action, bulk.value, bulk.affectedBooks.length, {
		valueLabel: linkFair?.name,
		note:
			linkFair && bulk.setFairDate ? `Purchase dates will be set to ${linkFair.date}.` : undefined
	})}
	confirmLabel="Apply"
	loadingLabel="Applying..."
	destructive={false}
	loading={bulkMutation.isPending}
	onconfirm={executeBulkEdit}
	oncancel={() => (showBulkConfirm = false)}
/>
