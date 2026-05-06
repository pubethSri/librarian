<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { createBookUpdateMutation } from '$lib/queries/books';
	import type { BookLocation, BookSource, BookWithReadings } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		book: BookWithReadings;
		onclose?: () => void;
	};

	let { open = $bindable(false), book, onclose }: Props = $props();

	const updateMutation = createBookUpdateMutation();

	// Form state — initialized from the book prop
	let volumeNumber = $state(String(book.volumeNumber));
	let location = $state<BookLocation>(book.location);
	let source = $state<BookSource | ''>(book.source || '');
	let boughtAt = $state(book.boughtAt ? book.boughtAt.split('T')[0] : '');
	let price = $state(book.price ? String(book.price) : '');
	let isDraft = $state(book.isDraft);

	// Sync form state when the book prop changes (e.g., switching which book to edit)
	$effect(() => {
		volumeNumber = String(book.volumeNumber);
		location = book.location;
		source = book.source || '';
		boughtAt = book.boughtAt ? book.boughtAt.split('T')[0] : '';
		price = book.price ? String(book.price) : '';
		isDraft = book.isDraft;
	});

	let isSubmitting = $state(false);

	async function handleSubmit() {
		if (!volumeNumber.trim()) {
			toast.error('Volume number is required');
			return;
		}

		isSubmitting = true;
		try {
			await updateMutation.mutateAsync({
				id: book.id,
				volumeNumber: Number(volumeNumber),
				location,
				source: source || undefined,
				boughtAt: boughtAt || undefined,
				price: price ? Number(price) : undefined,
				isDraft
			});
			toast.success(`Volume ${volumeNumber} updated`);
			open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update book');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onclose?.(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Volume {book.volumeNumber}</Dialog.Title>
			<Dialog.Description>
				Update this volume's details.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="edit-vol-num">Volume Number *</Label>
				<Input
					id="edit-vol-num"
					type="number"
					step="0.5"
					min="0"
					bind:value={volumeNumber}
				/>
			</div>

			<div class="space-y-2">
				<Label>Location</Label>
				<RadioGroup.Root bind:value={location} class="flex gap-4">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="home" id="edit-loc-home" />
						<Label for="edit-loc-home" class="font-normal">Home</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="apartment" id="edit-loc-apt" />
						<Label for="edit-loc-apt" class="font-normal">Apartment</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<div class="space-y-2">
				<Label>Source</Label>
				<Select.Root type="single" bind:value={source}>
					<Select.Trigger class="w-full">
						{source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Select source...'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="bookstore" label="Bookstore" />
						<Select.Item value="bookfair" label="Bookfair" />
						<Select.Item value="online" label="Online" />
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label for="edit-date">Purchase Date</Label>
				<Input id="edit-date" type="date" bind:value={boughtAt} />
			</div>

			<div class="space-y-2">
				<Label for="edit-price">Price</Label>
				<Input
					id="edit-price"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					bind:value={price}
				/>
			</div>

			<div class="flex items-center justify-between">
				<Label for="edit-draft-toggle" class="font-normal text-sm">Draft</Label>
				<Switch id="edit-draft-toggle" bind:checked={isDraft} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save Changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
