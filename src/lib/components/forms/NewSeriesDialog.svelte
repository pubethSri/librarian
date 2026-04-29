<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { createSeriesMutation } from '$lib/queries/series';
	import { createBookMutation } from '$lib/queries/books';
	import type { SeriesType, SeriesStatus, BookLocation, BookSource } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	const seriesMutation = createSeriesMutation();
	const bookMutation = createBookMutation();

	let step = $state<1 | 2>(1);

	// Step 1
	let shortName = $state('');
	let fullName = $state('');
	let seriesType = $state<SeriesType>('manga');
	let status = $state<SeriesStatus>('ongoing');
	let publisher = $state('');
	let totalVolumes = $state<string>('');
	let watchlist = $state(false);

	// Step 2
	let addFirstVolume = $state(true);
	let location = $state<BookLocation>('home');
	let source = $state<BookSource | ''>('');
	let boughtAt = $state(new Date().toISOString().split('T')[0]);
	let price = $state<string>('');

	let isSubmitting = $state(false);

	function resetForm() {
		step = 1;
		shortName = '';
		fullName = '';
		seriesType = 'manga';
		status = 'ongoing';
		publisher = '';
		totalVolumes = '';
		watchlist = false;
		addFirstVolume = true;
		location = 'home';
		source = '';
		boughtAt = new Date().toISOString().split('T')[0];
		price = '';
		isSubmitting = false;
	}

	function goToStep2() {
		if (!shortName.trim() || !fullName.trim()) {
			toast.error('Short name and full name are required');
			return;
		}
		step = 2;
	}

	async function handleSubmit() {
		isSubmitting = true;

		try {
			const created = await seriesMutation.mutateAsync({
				shortName: shortName.trim(),
				fullName: fullName.trim(),
				type: seriesType,
				status,
				publisher: publisher.trim() || undefined,
				totalVolumes: totalVolumes ? Number(totalVolumes) : undefined,
				watchlist
			});

			if (addFirstVolume) {
				await bookMutation.mutateAsync({
					seriesId: created.id,
					volumeNumber: 1,
					location,
					source: source || undefined,
					boughtAt: boughtAt || undefined,
					price: price ? Number(price) : undefined
				});
			}

			toast.success(
				addFirstVolume
					? `Created "${shortName}" with Volume 1`
					: `Created "${shortName}"`
			);
			resetForm();
			open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create series');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>
				{step === 1 ? 'New Series' : 'First Volume (Optional)'}
			</Dialog.Title>
			<Dialog.Description>
				{step === 1
					? 'Add a new series to your collection.'
					: 'Add the first volume of "' + shortName + '".'}
			</Dialog.Description>
		</Dialog.Header>

		{#if step === 1}
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="short-name">Short Name *</Label>
					<Input id="short-name" bind:value={shortName} placeholder="e.g. Bocchi" />
				</div>
				<div class="space-y-2">
					<Label for="full-name">Full Name *</Label>
					<Input id="full-name" bind:value={fullName} placeholder="e.g. Bocchi the Rock!" />
				</div>
				<div class="space-y-2">
					<Label>Type *</Label>
					<RadioGroup.Root bind:value={seriesType} class="flex gap-4">
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="manga" id="type-manga" />
							<Label for="type-manga" class="font-normal">Manga</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="light_novel" id="type-ln" />
							<Label for="type-ln" class="font-normal">Light Novel</Label>
						</div>
					</RadioGroup.Root>
				</div>
				<div class="space-y-2">
					<Label>Status</Label>
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger class="w-full">
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="ongoing" label="Ongoing" />
							<Select.Item value="ended" label="Ended" />
							<Select.Item value="dropped" label="Dropped" />
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="publisher">Publisher</Label>
					<Input id="publisher" bind:value={publisher} placeholder="Optional" />
				</div>
				<div class="space-y-2">
					<Label for="total-vols">Total Volumes</Label>
					<Input
						id="total-vols"
						type="number"
						min="0"
						bind:value={totalVolumes}
						placeholder="Optional"
					/>
				</div>
				<div class="flex items-center justify-between">
					<Label for="watchlist-toggle" class="font-normal text-sm">Add to Watchlist</Label>
					<Switch id="watchlist-toggle" bind:checked={watchlist} />
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={goToStep2}>Next: Add Volume</Button>
			</Dialog.Footer>
		{:else}
			<div class="space-y-4 py-4">
				<div class="flex items-center justify-between">
					<Label for="add-vol-toggle" class="font-normal text-sm">
						Add first volume now
					</Label>
					<Switch id="add-vol-toggle" bind:checked={addFirstVolume} />
				</div>

				{#if addFirstVolume}
					<div class="space-y-4 border-t border-border pt-4">
						<p class="text-sm font-medium text-foreground">Volume 1</p>

						<div class="space-y-2">
							<Label>Location</Label>
							<RadioGroup.Root bind:value={location} class="flex gap-4">
								<div class="flex items-center space-x-2">
									<RadioGroup.Item value="home" id="s2-loc-home" />
									<Label for="s2-loc-home" class="font-normal">Home</Label>
								</div>
								<div class="flex items-center space-x-2">
									<RadioGroup.Item value="apartment" id="s2-loc-apt" />
									<Label for="s2-loc-apt" class="font-normal">Apartment</Label>
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
							<Label for="s2-date">Purchase Date</Label>
							<Input id="s2-date" type="date" bind:value={boughtAt} />
						</div>

						<div class="space-y-2">
							<Label for="s2-price">Price (optional)</Label>
							<Input
								id="s2-price"
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								bind:value={price}
							/>
						</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (step = 1)}>Back</Button>
				<Button onclick={handleSubmit} disabled={isSubmitting}>
					{isSubmitting ? 'Creating...' : addFirstVolume ? 'Create Series + Volume' : 'Create Series'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
