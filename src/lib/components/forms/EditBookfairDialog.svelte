<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import SuggestInput from '$lib/components/forms/SuggestInput.svelte';
	import { distinctNames } from '$lib/utils/suggest';
	import { Label } from '$lib/components/ui/label';
	import { createBookfairUpdateMutation, createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { createBooksByEventQuery } from '$lib/queries/books';
	import { Switch } from '$lib/components/ui/switch';
	import { dayOf, formatDay } from '$lib/console/logic';
	import type { Bookfair } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		bookfair: Bookfair;
		onclose: () => void;
	};

	let { open = $bindable(false), bookfair, onclose }: Props = $props();

	const updateMutation = createBookfairUpdateMutation();

	let name = $state(bookfair.name);
	let date = $state(bookfair.date);
	let location = $state(bookfair.location || '');

	const bookfairsQuery = createBookfairsListQuery();
	const locations = $derived(distinctNames((bookfairsQuery.data ?? []).map((f) => f.location)));

	// Fixing the fair's date can carry its books along: only books still dated
	// exactly the old fair day, so a date entered on purpose stays
	const booksQuery = createBooksByEventQuery(() => bookfair.id);
	const dateChanged = $derived(!!date && date !== bookfair.date);
	const booksOnOldDate = $derived(
		(booksQuery.data ?? []).filter((b) => dayOf(b.boughtAt) === bookfair.date).length
	);
	let moveBookDates = $state(true);

	// Sync when bookfair prop changes
	$effect(() => {
		name = bookfair.name;
		date = bookfair.date;
		location = bookfair.location || '';
		moveBookDates = true;
	});

	function handleSubmit() {
		if (!name.trim()) {
			toast.error('Event name is required');
			return;
		}
		if (!date) {
			toast.error('Event date is required');
			return;
		}

		updateMutation.mutate(
			{
				id: bookfair.id,
				name: name.trim(),
				date,
				location: location.trim() || undefined,
				moveBookDates: dateChanged && booksOnOldDate > 0 && moveBookDates
			},
			{
				onSuccess: (result) => {
					toast.success(
						result.movedBooks > 0
							? `Bookfair updated · moved ${result.movedBooks} book${result.movedBooks > 1 ? 's' : ''} to ${formatDay(date)}`
							: 'Bookfair updated'
					);
					onclose();
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) onclose();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Bookfair</Dialog.Title>
			<Dialog.Description>Update details for "{bookfair.name}".</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="edit-bf-name">Event Name *</Label>
				<Input id="edit-bf-name" bind:value={name} />
			</div>
			<div class="space-y-2">
				<Label for="edit-bf-date">Date *</Label>
				<Input id="edit-bf-date" type="date" bind:value={date} />
				{#if dateChanged && booksOnOldDate > 0}
					<div
						class="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
					>
						<Label for="edit-bf-move-dates" class="text-xs leading-relaxed font-normal">
							Also move {booksOnOldDate} linked book{booksOnOldDate > 1 ? 's' : ''} dated
							{formatDay(bookfair.date)} → {formatDay(date)}
							<span class="block text-muted-foreground"
								>Books with any other purchase date stay as they are.</span
							>
						</Label>
						<Switch id="edit-bf-move-dates" size="sm" bind:checked={moveBookDates} />
					</div>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="edit-bf-location">Location</Label>
				<SuggestInput id="edit-bf-location" bind:value={location} options={locations} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onclose}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={updateMutation.isPending}>
				{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
