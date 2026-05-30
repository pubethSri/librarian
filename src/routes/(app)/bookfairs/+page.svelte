<script lang="ts">
	import {
		createBookfairsListQuery,
		createBookfairDeleteMutation
	} from '$lib/queries/bookfairs';
	import CreateBookfairDialog from '$lib/components/forms/CreateBookfairDialog.svelte';
	import EditBookfairDialog from '$lib/components/forms/EditBookfairDialog.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Plus, Calendar, MapPin, BookOpen, MoreVertical, Pencil, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { BookfairWithCount } from '$lib/types';

	const bookfairsQuery = createBookfairsListQuery();
	const deleteMutation = createBookfairDeleteMutation();

	let showCreateDialog = $state(false);

	// Edit dialog state
	let showEditDialog = $state(false);
	let editTarget = $state<BookfairWithCount | null>(null);

	// Delete dialog state
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<BookfairWithCount | null>(null);

	// Sort bookfairs by date (newest first)
	const sortedBookfairs = $derived(
		bookfairsQuery.data
			? [...bookfairsQuery.data].sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
				)
			: []
	);

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleEdit(bookfair: BookfairWithCount) {
		editTarget = bookfair;
		showEditDialog = true;
	}

	function handleDelete(bookfair: BookfairWithCount) {
		deleteTarget = bookfair;
		showDeleteConfirm = true;
	}

	function confirmDelete() {
		if (!deleteTarget) return;
		const name = deleteTarget.name;
		deleteMutation.mutate(deleteTarget.id, {
			onSuccess: () => {
				toast.success(`"${name}" deleted`);
				showDeleteConfirm = false;
				deleteTarget = null;
			},
			onError: (err: Error) => toast.error(err.message)
		});
	}

	function handleCardClick(id: number) {
		goto(`/bookfairs/${id}`);
	}
</script>

<svelte:head>
	<title>Bookfairs — Librarian</title>
	<meta name="description" content="Manage bookfair events and track your purchases." />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Bookfairs</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Manage bookfair events and track your hauls.
			</p>
		</div>
		<Button size="sm" class="gap-1.5" onclick={() => (showCreateDialog = true)}>
			<Plus class="h-3.5 w-3.5" />
			New Bookfair
		</Button>
	</div>

	<!-- Content -->
	{#if bookfairsQuery.isPending}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _}
				<Skeleton class="h-36 rounded-lg" />
			{/each}
		</div>
	{:else if bookfairsQuery.isError}
		<div class="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
			<p class="text-sm text-destructive">Failed to load bookfairs.</p>
			<Button
				variant="outline"
				size="sm"
				class="mt-3"
				onclick={() => bookfairsQuery.refetch()}
			>
				Retry
			</Button>
		</div>
	{:else if sortedBookfairs.length === 0}
		<EmptyState
			icon={Calendar}
			title="No bookfairs yet"
			description="Create your first bookfair event to start tracking purchases."
		/>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each sortedBookfairs as bookfair (bookfair.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="group relative cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/50"
					onclick={() => handleCardClick(bookfair.id)}
				>
					<!-- Kebab menu -->
					<div class="absolute right-3 top-3">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<button
										{...props}
										class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
										onclick={(e) => e.stopPropagation()}
									>
										<MoreVertical class="h-4 w-4" />
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										handleEdit(bookfair);
									}}
								>
									<Pencil class="mr-2 h-4 w-4" />
									Edit
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									class="text-destructive focus:text-destructive"
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										handleDelete(bookfair);
									}}
								>
									<Trash2 class="mr-2 h-4 w-4" />
									Delete
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>

					<!-- Card content -->
					<div class="space-y-3 pr-8">
						<h3 class="text-base font-semibold text-foreground leading-tight">
							{bookfair.name}
						</h3>

						<div class="flex flex-col gap-1.5 text-sm text-muted-foreground">
							<div class="flex items-center gap-1.5">
								<Calendar class="h-3.5 w-3.5 shrink-0" />
								<span>{formatDate(bookfair.date)}</span>
							</div>
							{#if bookfair.location}
								<div class="flex items-center gap-1.5">
									<MapPin class="h-3.5 w-3.5 shrink-0" />
									<span class="truncate">{bookfair.location}</span>
								</div>
							{/if}
						</div>

						<div class="pt-1">
							<Badge variant="secondary" class="gap-1 text-xs">
								<BookOpen class="h-3 w-3" />
								{bookfair.bookCount} {bookfair.bookCount === 1 ? 'book' : 'books'}
							</Badge>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Dialogs -->
<CreateBookfairDialog bind:open={showCreateDialog} />

{#if editTarget}
	<EditBookfairDialog
		bind:open={showEditDialog}
		bookfair={editTarget}
		onclose={() => {
			showEditDialog = false;
			editTarget = null;
		}}
	/>
{/if}

<DeleteConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Bookfair"
	description={deleteTarget
		? `Delete "${deleteTarget.name}"? Books linked to this event will keep their data but lose the event reference.`
		: ''}
	loading={deleteMutation.isPending}
	onconfirm={confirmDelete}
	oncancel={() => {
		showDeleteConfirm = false;
		deleteTarget = null;
	}}
/>
