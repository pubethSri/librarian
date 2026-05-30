<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { createBookfairUpdateMutation } from '$lib/queries/bookfairs';
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

	// Sync when bookfair prop changes
	$effect(() => {
		name = bookfair.name;
		date = bookfair.date;
		location = bookfair.location || '';
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
				location: location.trim() || undefined
			},
			{
				onSuccess: () => {
					toast.success('Bookfair updated');
					onclose();
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onclose(); }}>
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
			</div>
			<div class="space-y-2">
				<Label for="edit-bf-location">Location</Label>
				<Input id="edit-bf-location" bind:value={location} placeholder="Optional" />
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
