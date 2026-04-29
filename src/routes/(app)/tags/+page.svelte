<script lang="ts">
	import { createTagsListQuery, createTagMutation, createTagDeleteMutation } from '$lib/queries/tags';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus, Trash2, Tags } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	const tagsQuery = createTagsListQuery();
	const createTagMut = createTagMutation();
	const deleteTagMut = createTagDeleteMutation();

	let newTagName = $state('');
	let deleteId = $state<number | null>(null);
	let deleteTagName = $state('');
	let showDeleteConfirm = $state(false);

	function handleCreate() {
		const name = newTagName.trim();
		if (!name) {
			toast.error('Tag name is required');
			return;
		}

		createTagMut.mutate(name, {
			onSuccess: () => {
				toast.success(`Tag "${name}" created`);
				newTagName = '';
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}

	function handleDelete(id: number, name: string) {
		deleteId = id;
		deleteTagName = name;
		showDeleteConfirm = true;
	}

	function confirmDelete() {
		if (!deleteId) return;
		deleteTagMut.mutate(deleteId, {
			onSuccess: () => {
				toast.success('Tag deleted');
				deleteId = null;
				showDeleteConfirm = false;
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}
</script>

<svelte:head>
	<title>Tags — Librarian</title>
	<meta name="description" content="Manage tags for your series collection." />
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Tags</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Create and manage tags for organizing your series.
		</p>
	</div>

	<!-- Add tag form -->
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreate();
		}}
		class="flex items-center gap-2"
	>
		<Input
			bind:value={newTagName}
			placeholder="New tag name..."
			class="h-9 max-w-xs"
		/>
		<Button type="submit" size="sm" disabled={createTagMut.isPending} class="gap-1.5">
			<Plus class="h-3.5 w-3.5" />
			{createTagMut.isPending ? 'Adding...' : 'Add Tag'}
		</Button>
	</form>

	<!-- Tags list -->
	{#if tagsQuery.isPending}
		<div class="flex flex-wrap gap-3">
			{#each Array(6) as _}
				<Skeleton class="h-10 w-24" />
			{/each}
		</div>
	{:else if tagsQuery.isError}
		<div class="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
			<p class="text-sm text-destructive">Failed to load tags.</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={() => tagsQuery.refetch()}>
				Retry
			</Button>
		</div>
	{:else if tagsQuery.data}
		{#if tagsQuery.data.length === 0}
			<EmptyState
				icon={Tags}
				title="No tags yet"
				description="Create your first tag to start organizing your series."
			/>
		{:else}
			<div class="space-y-2">
				{#each tagsQuery.data as tag}
					<div
						class="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent/50"
					>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium text-foreground">{tag.name}</span>
							<Badge variant="outline" class="text-xs text-muted-foreground">
								{tag.seriesCount} series
							</Badge>
						</div>
						<Button
							variant="ghost"
							size="icon"
							class="h-8 w-8 text-muted-foreground hover:text-destructive"
							onclick={() => handleDelete(tag.id, tag.name)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<DeleteConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Tag"
	description={'Delete tag "' + deleteTagName + '"? It will be removed from all series.'}
	loading={deleteTagMut.isPending}
	onconfirm={confirmDelete}
	oncancel={() => {
		showDeleteConfirm = false;
		deleteId = null;
	}}
/>
