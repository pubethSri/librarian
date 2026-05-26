<script lang="ts">
	import { createBooksListQuery, createBookDeleteMutation } from '$lib/queries/books';
	import { createTagsListQuery } from '$lib/queries/tags';
	import type { BookListItem } from '$lib/types';
	import BooksTable from '$lib/components/BooksTable.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import NewVolumeDialog from '$lib/components/forms/NewVolumeDialog.svelte';
	import EditBookDialog from '$lib/components/forms/EditBookDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	const booksQuery = createBooksListQuery();
	const tagsQuery = createTagsListQuery();
	const deleteMutation = createBookDeleteMutation();

	let showAddVolume = $state(false);
	let deleteId = $state<number | null>(null);
	let showDeleteConfirm = $state(false);
	let editingBook = $state<BookListItem | null>(null);
	let showEditBookDialog = $state(false);

	function handleDelete(id: number) {
		deleteId = id;
		showDeleteConfirm = true;
	}

	function handleEdit(book: BookListItem) {
		editingBook = book;
		showEditBookDialog = true;
	}

	function confirmDelete() {
		if (!deleteId) return;
		deleteMutation.mutate(deleteId, {
			onSuccess: () => {
				toast.success('Book deleted');
				deleteId = null;
				showDeleteConfirm = false;
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}
</script>

<svelte:head>
	<title>Books — Librarian</title>
	<meta name="description" content="Browse your full book collection." />
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Books</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Browse your full book collection.
			</p>
		</div>
		<Button onclick={() => (showAddVolume = true)} class="gap-2">
			<Plus class="h-4 w-4" />
			Add Book
		</Button>
	</div>

	{#if booksQuery.isPending}
		<div class="space-y-3">
			{#each Array(8) as _}
				<Skeleton class="h-12 w-full" />
			{/each}
		</div>
	{:else if booksQuery.isError}
		<div class="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
			<p class="text-sm text-destructive">Failed to load books. Please try again.</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={() => booksQuery.refetch()}>
				Retry
			</Button>
		</div>
	{:else if booksQuery.data}
		<BooksTable data={booksQuery.data} allTags={tagsQuery.data ?? []} onDelete={handleDelete} onEdit={handleEdit} />
	{/if}
</div>

<NewVolumeDialog bind:open={showAddVolume} />
<DeleteConfirmDialog
	bind:open={showDeleteConfirm}
	description="This will permanently delete this book and its reading history."
	loading={deleteMutation.isPending}
	onconfirm={confirmDelete}
	oncancel={() => {
		showDeleteConfirm = false;
		deleteId = null;
	}}
/>
{#if editingBook}
	<EditBookDialog
		open={showEditBookDialog}
		book={editingBook}
		onclose={() => { showEditBookDialog = false; editingBook = null; }}
	/>
{/if}
