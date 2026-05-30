<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createBookfairDetailQuery, createBookfairDeleteMutation } from '$lib/queries/bookfairs';
	import { createBooksByEventQuery } from '$lib/queries/books';
	import EditBookfairDialog from '$lib/components/forms/EditBookfairDialog.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import {
		Pencil,
		Trash2,
		Calendar,
		MapPin,
		BookOpen,
		ShoppingCart,
		Library,
		Terminal
	} from '@lucide/svelte';
	import { BOOK_LOCATION_LABELS, BOOK_SOURCE_LABELS } from '$lib/types';
	import { toast } from 'svelte-sonner';

	const bookfairId = Number($page.params.id);
	const detailQuery = createBookfairDetailQuery(bookfairId);
	const booksQuery = createBooksByEventQuery(bookfairId);
	const deleteMutation = createBookfairDeleteMutation();

	let showEditDialog = $state(false);
	let showDeleteConfirm = $state(false);

	// Computed stats from books
	const uniqueSeriesCount = $derived(() => {
		if (!booksQuery.data) return 0;
		return new Set(booksQuery.data.map((b) => b.seriesId)).size;
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatPrice(price: string | null): string {
		if (!price) return '—';
		return `฿${Number(price).toLocaleString()}`;
	}

	function handleDelete() {
		deleteMutation.mutate(bookfairId, {
			onSuccess: () => {
				toast.success('Bookfair deleted');
				goto('/bookfairs');
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}

	function openInConsole() {
		goto(`/console?scope=bookfair&id=${bookfairId}`);
	}
</script>

<svelte:head>
	<title>
		{detailQuery.data ? `${detailQuery.data.name} — Librarian` : 'Bookfair — Librarian'}
	</title>
</svelte:head>

{#if detailQuery.isPending}
	<div class="space-y-6">
		<Skeleton class="h-10 w-64" />
		<Skeleton class="h-6 w-96" />
		<div class="grid grid-cols-3 gap-4">
			{#each Array(3) as _}
				<Skeleton class="h-20" />
			{/each}
		</div>
		<Skeleton class="h-64" />
	</div>
{:else if detailQuery.isError}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<h2 class="text-2xl font-bold text-foreground">Bookfair Not Found</h2>
		<p class="mt-2 text-muted-foreground">The bookfair you're looking for doesn't exist.</p>
		<Button variant="outline" class="mt-4" onclick={() => goto('/bookfairs')}>
			Back to Bookfairs
		</Button>
	</div>
{:else if detailQuery.data}
	{@const bf = detailQuery.data}
	<div class="space-y-8">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-2">
				<h1 class="text-3xl font-bold tracking-tight text-foreground">{bf.name}</h1>
				<div class="flex items-center gap-4 text-sm text-muted-foreground">
					<div class="flex items-center gap-1.5">
						<Calendar class="h-4 w-4" />
						<span>{formatDate(bf.date)}</span>
					</div>
					{#if bf.location}
						<div class="flex items-center gap-1.5">
							<MapPin class="h-4 w-4" />
							<span>{bf.location}</span>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button size="sm" class="gap-1.5" onclick={openInConsole}>
					<Terminal class="h-3.5 w-3.5" />
					Open in Console
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (showEditDialog = true)}
					class="gap-1.5"
				>
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
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Books Purchased</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">
					{bf.bookCount}
				</p>
			</div>
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Total Spent</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">
					฿{bf.totalSpent.toLocaleString()}
				</p>
			</div>
			<div class="rounded-lg border border-border p-4">
				<p class="text-sm text-muted-foreground">Unique Series</p>
				<p class="mt-1 text-2xl font-bold tabular-nums text-foreground">
					{uniqueSeriesCount()}
				</p>
			</div>
		</div>

		<!-- Books table -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-foreground">Haul</h2>
				{#if bf.bookCount > 0}
					<Badge variant="outline" class="text-xs">
						{bf.bookCount} {bf.bookCount === 1 ? 'volume' : 'volumes'}
					</Badge>
				{/if}
			</div>

			{#if booksQuery.isPending}
				<Skeleton class="h-48" />
			{:else if booksQuery.isError}
				<div
					class="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center"
				>
					<p class="text-sm text-destructive">Failed to load books.</p>
					<Button
						variant="outline"
						size="sm"
						class="mt-3"
						onclick={() => booksQuery.refetch()}
					>
						Retry
					</Button>
				</div>
			{:else if booksQuery.data && booksQuery.data.length > 0}
				<div class="rounded-md border border-border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Series</Table.Head>
								<Table.Head class="w-20 text-center">Vol.</Table.Head>
								<Table.Head>Location</Table.Head>
								<Table.Head class="text-right">Price</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each booksQuery.data as book (book.id)}
								<Table.Row>
									<Table.Cell>
										<button
											class="text-left font-medium text-foreground hover:underline"
											onclick={() => goto(`/series/${book.seriesId}`)}
										>
											{book.seriesShortName}
										</button>
										{#if book.isDraft}
											<Badge variant="outline" class="ml-2 text-xs">Draft</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-center tabular-nums">
										{book.volumeNumber}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{BOOK_LOCATION_LABELS[book.location]}
									</Table.Cell>
									<Table.Cell class="text-right tabular-nums">
										{formatPrice(book.price)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<EmptyState
					icon={ShoppingCart}
					title="No books yet"
					description="Open the Console to start adding books to this bookfair."
				/>
			{/if}
		</div>
	</div>

	<!-- Dialogs -->
	<EditBookfairDialog
		bind:open={showEditDialog}
		bookfair={bf}
		onclose={() => {
			showEditDialog = false;
		}}
	/>

	<DeleteConfirmDialog
		bind:open={showDeleteConfirm}
		title="Delete Bookfair"
		description={`Delete "${bf.name}"? Books linked to this event will keep their data but lose the event reference.`}
		loading={deleteMutation.isPending}
		onconfirm={handleDelete}
		oncancel={() => (showDeleteConfirm = false)}
	/>
{/if}
