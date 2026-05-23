<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createSeriesDetailQuery } from '$lib/queries/seriesDetail';
	import { createSeriesDeleteMutation, createSeriesUpdateMutation } from '$lib/queries/series';
	import { createBookDeleteMutation } from '$lib/queries/books';
	import type { SeriesStatus } from '$lib/types';
	import { BOOK_LOCATION_LABELS, BOOK_SOURCE_LABELS, READING_STATUS_LABELS } from '$lib/types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TypeBadge from '$lib/components/TypeBadge.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import EditSeriesDialog from '$lib/components/series/EditSeriesDialog.svelte';
	import TagsEditor from '$lib/components/series/TagsEditor.svelte';
	import NewVolumeDialog from '$lib/components/forms/NewVolumeDialog.svelte';
	import EditBookDialog from '$lib/components/forms/EditBookDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import { Pencil, Trash2, Plus, Star, Tag, BookOpen } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	const seriesId = Number($page.params.id);
	const detailQuery = createSeriesDetailQuery(seriesId);
	const updateMutation = createSeriesUpdateMutation();
	const deleteMutation = createSeriesDeleteMutation();
	const bookDeleteMutation = createBookDeleteMutation();

	let showEditDialog = $state(false);
	let showTagsEditor = $state(false);
	let showAddVolume = $state(false);
	let showDeleteConfirm = $state(false);
	let deleteBookId = $state<number | null>(null);
	let showDeleteBookConfirm = $state(false);
	let editingBook = $state<import('$lib/types').BookWithReadings | null>(null);
	let showEditBookDialog = $state(false);

	function handleStatusChange(status: SeriesStatus) {
		updateMutation.mutate(
			{ id: seriesId, status },
			{
				onSuccess: () => toast.success('Status updated'),
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}

	function handleWatchlistToggle() {
		if (!detailQuery.data) return;
		updateMutation.mutate(
			{ id: seriesId, watchlist: !detailQuery.data.watchlist },
			{
				onSuccess: () => toast.success('Watchlist updated'),
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}

	function handleDeleteSeries() {
		deleteMutation.mutate(seriesId, {
			onSuccess: () => {
				toast.success('Series deleted');
				goto('/series');
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}

	function handleDeleteBook() {
		if (!deleteBookId) return;
		bookDeleteMutation.mutate(deleteBookId, {
			onSuccess: () => {
				toast.success('Volume deleted');
				deleteBookId = null;
				showDeleteBookConfirm = false;
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getLatestReadingStatus(readings: { status: string }[]): string {
		if (!readings.length) return 'Unread';
		return READING_STATUS_LABELS[readings[0].status as keyof typeof READING_STATUS_LABELS] || readings[0].status;
	}
</script>

<svelte:head>
	<title>
		{detailQuery.data ? `${detailQuery.data.shortName} — Librarian` : 'Series — Librarian'}
	</title>
</svelte:head>

{#if detailQuery.isPending}
	<div class="space-y-6">
		<Skeleton class="h-10 w-64" />
		<Skeleton class="h-6 w-96" />
		<div class="grid grid-cols-4 gap-4">
			{#each Array(4) as _}
				<Skeleton class="h-20" />
			{/each}
		</div>
		<Skeleton class="h-64" />
	</div>
{:else if detailQuery.isError}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<h2 class="text-2xl font-bold text-foreground">Series Not Found</h2>
		<p class="mt-2 text-muted-foreground">The series you're looking for doesn't exist.</p>
		<Button variant="outline" class="mt-4" onclick={() => goto('/series')}>Back to Series</Button>
	</div>
{:else if detailQuery.data}
	{@const s = detailQuery.data}
	<div class="space-y-8">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-2">
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold tracking-tight text-foreground">{s.shortName}</h1>
					<TypeBadge type={s.type} />
					<StatusBadge status={s.status} editable onchange={handleStatusChange} />
				</div>
				<p class="text-sm text-muted-foreground">{s.fullName}</p>
				{#if s.publisher}
					<p class="text-sm text-muted-foreground">Published by {s.publisher}</p>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onclick={handleWatchlistToggle}
					class={s.watchlist ? 'text-foreground' : 'text-muted-foreground'}
				>
					<Star class="h-5 w-5 {s.watchlist ? 'fill-current' : ''}" />
				</Button>
				<Button variant="outline" size="sm" onclick={() => (showEditDialog = true)} class="gap-1.5">
					<Pencil class="h-3.5 w-3.5" />
					Edit
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (showDeleteConfirm = true)}
					class="gap-1.5 text-destructive hover:text-destructive"
				>
					<Trash2 class="h-3.5 w-3.5" />
					Delete
				</Button>
			</div>
		</div>

		<!-- Stats row -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Volumes Owned</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{s.books.length}</p>
			</div>
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Total Volumes</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">
					{s.totalVolumes ?? '?'}
				</p>
			</div>
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Progress</p>
				<div class="mt-2">
					<ProgressBar owned={s.books.length} total={s.totalVolumes} />
				</div>
			</div>
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Unread</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">
					{s.books.filter((b) => !b.readings.length || b.readings[0].status === 'unread').length}
				</p>
			</div>
		</div>

		<!-- Tags -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
					<Tag class="h-4 w-4" />
					Tags
				</h2>
				<Button variant="ghost" size="sm" onclick={() => (showTagsEditor = true)}>
					Edit Tags
				</Button>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if s.tags.length === 0}
					<p class="text-sm text-muted-foreground">No tags assigned.</p>
				{:else}
					{#each s.tags as tag}
						<Badge variant="outline">{tag.name}</Badge>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Volumes table -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
					<BookOpen class="h-4 w-4" />
					Volumes ({s.books.length})
				</h2>
				<Button size="sm" onclick={() => (showAddVolume = true)} class="gap-1.5">
					<Plus class="h-3.5 w-3.5" />
					Add Volume
				</Button>
			</div>

			{#if s.books.length === 0}
				<EmptyState
					title="No volumes yet"
					description="Add the first volume to start tracking."
				/>
			{:else}
				<div class="rounded-md border border-border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Vol.</Table.Head>
								<Table.Head>Location</Table.Head>
								<Table.Head>Source</Table.Head>
								<Table.Head>Purchased</Table.Head>
								<Table.Head>Price</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="w-[80px]"></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each s.books as book}
								<Table.Row>
									<Table.Cell class="font-mono font-medium tabular-nums">
										{book.volumeNumber}
										{#if book.isDraft}
											<Badge variant="outline" class="ml-2 text-xs text-amber-600 border-amber-300">
												Draft
											</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{BOOK_LOCATION_LABELS[book.location]}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{book.source ? BOOK_SOURCE_LABELS[book.source] : '—'}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{formatDate(book.boughtAt)}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground font-mono tabular-nums">
										{book.price ? `฿${Number(book.price).toFixed(2)}` : '—'}
									</Table.Cell>
									<Table.Cell>
										<Badge variant="outline" class="text-xs">
											{getLatestReadingStatus(book.readings)}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-muted-foreground hover:text-foreground"
												onclick={() => { editingBook = book; showEditBookDialog = true; }}
											>
												<Pencil class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-muted-foreground hover:text-destructive"
												onclick={() => {
													deleteBookId = book.id;
													showDeleteBookConfirm = true;
												}}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</div>
	</div>

	<!-- Dialogs -->
	<EditSeriesDialog bind:open={showEditDialog} series={s} />
	<TagsEditor bind:open={showTagsEditor} {seriesId} currentTags={s.tags} />
	<NewVolumeDialog bind:open={showAddVolume} preselectedSeriesId={seriesId} />
	<DeleteConfirmDialog
		bind:open={showDeleteConfirm}
		title="Delete Series"
		description={'This will permanently delete "' + s.shortName + '" and all ' + s.books.length + ' volumes. This action cannot be undone.'}
		confirmText="I want to delete"
		loading={deleteMutation.isPending}
		onconfirm={handleDeleteSeries}
		oncancel={() => (showDeleteConfirm = false)}
	/>
	<DeleteConfirmDialog
		bind:open={showDeleteBookConfirm}
		title="Delete Volume"
		description="This will permanently delete this volume and its reading history."
		loading={bookDeleteMutation.isPending}
		onconfirm={handleDeleteBook}
		oncancel={() => {
			showDeleteBookConfirm = false;
			deleteBookId = null;
		}}
	/>
	{#if editingBook}
		<EditBookDialog
			open={showEditBookDialog}
			book={editingBook}
			onclose={() => { showEditBookDialog = false; editingBook = null; }}
		/>
	{/if}
{/if}
