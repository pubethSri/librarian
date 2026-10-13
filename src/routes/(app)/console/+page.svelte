<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createBooksListQuery, createBooksByEventQuery } from '$lib/queries/books';
	import { createBookfairsListQuery, createBookfairDetailQuery } from '$lib/queries/bookfairs';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import ScopeBar from '$lib/components/console/ScopeBar.svelte';
	import PreviewPanel from '$lib/components/console/PreviewPanel.svelte';
	import BulkEditPanel from '$lib/components/console/BulkEditPanel.svelte';
	import AddBooksPanel from '$lib/components/console/AddBooksPanel.svelte';
	import { toBatchPayload, toBulkUpdates } from '$lib/console/logic';
	import { createStagingStore } from '$lib/console/staging.svelte';
	import { createBulkEditStore } from '$lib/console/bulkEdit.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
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
		scopeType === 'bookfair' && scopeId ? eventBooksQuery.isPending : allBooksQuery.isPending
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
		<PreviewPanel
			books={scopedBooks}
			{isLoading}
			{staging}
			{bulk}
			{isCommitting}
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
						books={scopedBooks}
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
	description={`Apply "${bulk.action === 'location' ? 'Change location' : bulk.action === 'source' ? 'Set source' : 'Set draft status'}" to ${bulk.affectedBooks.length} book${bulk.affectedBooks.length !== 1 ? 's' : ''}? This cannot be undone.`}
	loading={isBulkExecuting}
	onconfirm={executeBulkEdit}
	oncancel={() => (showBulkConfirm = false)}
/>
