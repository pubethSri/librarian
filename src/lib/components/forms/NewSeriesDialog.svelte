<script lang="ts">
	import PublisherInput from '$lib/components/forms/PublisherInput.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { Minus, Plus } from '@lucide/svelte';
	import { createSeriesMutation } from '$lib/queries/series';
	import { createBatchBookMutation } from '$lib/queries/batch';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import type { SeriesType, SeriesStatus, BookLocation, BookSource } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	const seriesMutation = createSeriesMutation();
	const batchMutation = createBatchBookMutation();
	const bookfairsQuery = createBookfairsListQuery();

	/** Same per-batch cap as the Console's Add Books */
	const MAX_VOLUMES = 50;

	let step = $state<1 | 2>(1);

	// Step 1 — the series. Total volumes (the published count) stays in Edit Series.
	let shortName = $state('');
	let fullName = $state('');
	let seriesType = $state<SeriesType>('manga');
	let status = $state<SeriesStatus>('ongoing');
	let publisher = $state('');
	let watchlist = $state(false);

	// Step 2 — the volumes you own, Vol. 1 → Vol. volumeCount
	let addVolumes = $state(true);
	let volumeCount = $state(1);
	let location = $state<BookLocation>('apartment');
	let source = $state<BookSource | ''>('');
	let sourceEventId = $state<number | null>(null);
	let boughtAt = $state(new Date().toISOString().split('T')[0]);

	let isSubmitting = $state(false);

	function resetForm() {
		step = 1;
		shortName = '';
		fullName = '';
		seriesType = 'manga';
		status = 'ongoing';
		publisher = '';
		watchlist = false;
		addVolumes = true;
		volumeCount = 1;
		location = 'apartment';
		source = '';
		sourceEventId = null;
		boughtAt = new Date().toISOString().split('T')[0];
		isSubmitting = false;
	}

	function setVolumeCount(n: number) {
		volumeCount = Number.isFinite(n) ? Math.min(MAX_VOLUMES, Math.max(1, Math.round(n))) : 1;
	}

	const volumeRangeLabel = $derived(volumeCount === 1 ? 'Vol. 1' : `Vol. 1 → Vol. ${volumeCount}`);

	function goToStep2() {
		if (!shortName.trim() || !fullName.trim()) {
			toast.error('Short name and full name are required');
			return;
		}
		step = 2;
	}

	async function handleSubmit() {
		isSubmitting = true;
		const name = shortName.trim();

		let created: { id: number };
		try {
			created = await seriesMutation.mutateAsync({
				shortName: name,
				fullName: fullName.trim(),
				type: seriesType,
				status,
				publisher: publisher.trim() || undefined,
				watchlist
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create series');
			isSubmitting = false;
			return;
		}

		if (addVolumes) {
			try {
				await batchMutation.mutateAsync({
					books: Array.from({ length: volumeCount }, (_, i) => ({
						seriesId: created.id,
						volumeNumber: i + 1,
						location,
						source: source || undefined,
						sourceEventId: source === 'bookfair' && sourceEventId ? sourceEventId : undefined,
						boughtAt: boughtAt || undefined
					}))
				});
			} catch (err) {
				// The series exists; only its volumes failed — say so, so nothing is re-created
				toast.error(
					`Created "${name}", but adding its volumes failed: ${err instanceof Error ? err.message : 'unknown error'}. Add them from the Console.`
				);
				resetForm();
				open = false;
				return;
			}
		}

		toast.success(addVolumes ? `Created "${name}" with ${volumeRangeLabel}` : `Created "${name}"`);
		resetForm();
		open = false;
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
			<Dialog.Title>
				{step === 1 ? 'New Series' : 'Add Volumes (Optional)'}
			</Dialog.Title>
			<Dialog.Description>
				{step === 1
					? 'Add a new series to your collection.'
					: 'Add the volumes of "' + shortName + '" you own, starting from Vol. 1.'}
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
					<PublisherInput id="publisher" bind:value={publisher} />
				</div>
				<div class="flex items-center justify-between">
					<Label for="watchlist-toggle" class="text-sm font-normal">Add to Watchlist</Label>
					<Switch id="watchlist-toggle" bind:checked={watchlist} />
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={goToStep2}>Next: Add Volumes</Button>
			</Dialog.Footer>
		{:else}
			<div class="space-y-4 py-4">
				<div class="flex items-center justify-between">
					<Label for="add-vol-toggle" class="text-sm font-normal">Add volumes now</Label>
					<Switch id="add-vol-toggle" bind:checked={addVolumes} />
				</div>

				{#if addVolumes}
					<div class="space-y-4 border-t border-border pt-4">
						<div class="space-y-2">
							<Label for="s2-count">How many volumes do you own?</Label>
							<div class="flex items-center gap-2">
								<Button
									variant="outline"
									size="icon"
									class="h-9 w-9"
									aria-label="One fewer volume"
									disabled={volumeCount <= 1}
									onclick={() => setVolumeCount(volumeCount - 1)}
								>
									<Minus class="h-4 w-4" />
								</Button>
								<Input
									id="s2-count"
									type="number"
									min="1"
									max={MAX_VOLUMES}
									class="h-9 w-16 text-center tabular-nums"
									value={volumeCount}
									onchange={(e) => setVolumeCount(Number(e.currentTarget.value))}
								/>
								<Button
									variant="outline"
									size="icon"
									class="h-9 w-9"
									aria-label="One more volume"
									disabled={volumeCount >= MAX_VOLUMES}
									onclick={() => setVolumeCount(volumeCount + 1)}
								>
									<Plus class="h-4 w-4" />
								</Button>
								<span class="ml-1 font-mono text-sm text-muted-foreground tabular-nums">
									{volumeRangeLabel}
								</span>
							</div>
						</div>

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
							<Select.Root
								type="single"
								bind:value={source}
								onValueChange={() => (sourceEventId = null)}
							>
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
								<Select.Root
									type="single"
									bind:value={
										() => (sourceEventId ? String(sourceEventId) : ''),
										(v) => {
											sourceEventId = v ? Number(v) : null;
											// Bought at the fair → default the date to the fair's date
											const fair = bookfairsQuery.data?.find((bf) => bf.id === sourceEventId);
											if (fair) boughtAt = fair.date;
										}
									}
								>
									<Select.Trigger class="w-full">
										{bookfairsQuery.data.find((bf) => bf.id === sourceEventId)?.name ??
											'Select event...'}
									</Select.Trigger>
									<Select.Content>
										{#each bookfairsQuery.data as bf (bf.id)}
											<Select.Item value={String(bf.id)} label={bf.name} />
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}

						<div class="space-y-2">
							<Label for="s2-date">Purchase Date</Label>
							<Input id="s2-date" type="date" bind:value={boughtAt} />
						</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (step = 1)}>Back</Button>
				<Button onclick={handleSubmit} disabled={isSubmitting}>
					{isSubmitting
						? 'Creating...'
						: addVolumes
							? `Create Series + ${volumeCount === 1 ? '1 Volume' : `${volumeCount} Volumes`}`
							: 'Create Series'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
