<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SuggestInput from '$lib/components/forms/SuggestInput.svelte';
	import { createBookfairMutation, createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { nextEditions } from '$lib/utils/bookfairNames';
	import { distinctNames } from '$lib/utils/suggest';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	const mutation = createBookfairMutation();

	let name = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);
	let location = $state('');

	// Suggestions from the fairs already logged: each recurring event's next
	// edition (nearest the chosen date first), and every location used so far
	const bookfairsQuery = createBookfairsListQuery();
	const editions = $derived(nextEditions(bookfairsQuery.data ?? [], date));
	const locations = $derived(distinctNames((bookfairsQuery.data ?? []).map((f) => f.location)));

	/** Picking a next edition also fills in where that event was last held */
	function handleNamePick(picked: string) {
		const edition = editions.find((e) => e.name === picked);
		if (edition?.location && !location.trim()) location = edition.location;
	}

	function resetForm() {
		name = '';
		date = new Date().toISOString().split('T')[0];
		location = '';
	}

	function handleSubmit() {
		if (!name.trim()) {
			toast.error('Event name is required');
			return;
		}
		if (!date) {
			toast.error('Event date is required');
			return;
		}

		mutation.mutate(
			{
				name: name.trim(),
				date,
				location: location.trim() || undefined
			},
			{
				onSuccess: () => {
					toast.success(`Bookfair "${name.trim()}" created`);
					resetForm();
					open = false;
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) resetForm();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>New Bookfair</Dialog.Title>
			<Dialog.Description>Create a new bookfair event to track purchases.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="bf-name">Event Name *</Label>
				<SuggestInput
					id="bf-name"
					bind:value={name}
					options={editions.map((e) => e.name)}
					placeholder="e.g. Big Bad Wolf 2026"
					snap={false}
					onpick={handleNamePick}
				/>
			</div>
			<div class="space-y-2">
				<Label for="bf-date">Date *</Label>
				<Input id="bf-date" type="date" bind:value={date} />
			</div>
			<div class="space-y-2">
				<Label for="bf-location">Location</Label>
				<SuggestInput id="bf-location" bind:value={location} options={locations} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={mutation.isPending}>
				{mutation.isPending ? 'Creating...' : 'Create Bookfair'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
