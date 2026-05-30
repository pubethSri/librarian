<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import SeriesSearch from '$lib/components/forms/SeriesSearch.svelte';
	import { createBookMutation } from '$lib/queries/books';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import type { SeriesListItem, BookLocation, BookSource } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		preselectedSeriesId?: number | null;
	};

	let { open = $bindable(false), preselectedSeriesId = null }: Props = $props();

	const bookMutation = createBookMutation();
	const bookfairsQuery = createBookfairsListQuery();

	let selectedSeriesId = $state<number | null>(preselectedSeriesId);
	let volumeNumber = $state<number>(1);
	let location = $state<BookLocation>('home');
	let source = $state<BookSource | ''>('');
	let sourceEventId = $state<number | null>(null);
	let boughtAt = $state(new Date().toISOString().split('T')[0]);
	let price = $state<string>('');
	let isDraft = $state(false);

	function handleSeriesSelect(series: SeriesListItem) {
		selectedSeriesId = series.id;
		volumeNumber = series.bookCount + 1;
	}

	function resetForm() {
		selectedSeriesId = preselectedSeriesId;
		volumeNumber = 1;
		location = 'home';
		source = '';
		sourceEventId = null;
		boughtAt = new Date().toISOString().split('T')[0];
		price = '';
		isDraft = false;
	}

	function handleSubmit() {
		if (!selectedSeriesId) {
			toast.error('Please select a series');
			return;
		}

		bookMutation.mutate(
			{
				seriesId: selectedSeriesId,
				volumeNumber,
				location,
				source: source || undefined,
				sourceEventId: source === 'bookfair' && sourceEventId ? sourceEventId : undefined,
				boughtAt: boughtAt || undefined,
				price: price ? Number(price) : undefined,
				isDraft
			},
			{
				onSuccess: () => {
					toast.success(`Volume ${volumeNumber} added`);
					resetForm();
					open = false;
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Volume</Dialog.Title>
			<Dialog.Description>Add a new volume to your collection.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label>Series</Label>
				<SeriesSearch value={selectedSeriesId} onselect={handleSeriesSelect} />
			</div>

			<div class="space-y-2">
				<Label for="volume-number">Volume Number</Label>
				<Input
					id="volume-number"
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
						<RadioGroup.Item value="home" id="loc-home" />
						<Label for="loc-home" class="font-normal">Home</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="apartment" id="loc-apartment" />
						<Label for="loc-apartment" class="font-normal">Apartment</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<div class="space-y-2">
				<Label>Source</Label>
				<Select.Root type="single" bind:value={source} onValueChange={() => { sourceEventId = null; }}>
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

			{#if source === 'bookfair' && bookfairsQuery.data && bookfairsQuery.data.length > 0}
				<div class="space-y-2">
					<Label>Bookfair Event</Label>
					<Select.Root type="single" bind:value={sourceEventId}>
						<Select.Trigger class="w-full">
							{#if sourceEventId}
								{@const selected = bookfairsQuery.data.find((bf) => bf.id === sourceEventId)}
								{selected?.name ?? 'Select event...'}
							{:else}
								Select event...
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each bookfairsQuery.data as bf (bf.id)}
								<Select.Item value={bf.id} label={bf.name} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="bought-at">Purchase Date</Label>
				<Input id="bought-at" type="date" bind:value={boughtAt} />
			</div>

			<div class="space-y-2">
				<Label for="price">Price (optional)</Label>
				<Input id="price" type="number" step="0.01" min="0" placeholder="0.00" bind:value={price} />
			</div>

			<div class="flex items-center justify-between">
				<Label for="draft-toggle" class="font-normal text-sm text-muted-foreground">
					Save as draft (incomplete entry)
				</Label>
				<Switch id="draft-toggle" bind:checked={isDraft} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={bookMutation.isPending}>
				{bookMutation.isPending ? 'Adding...' : 'Add Volume'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
