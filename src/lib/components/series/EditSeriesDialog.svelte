<script lang="ts">
	import PublisherInput from '$lib/components/forms/PublisherInput.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { createSeriesUpdateMutation } from '$lib/queries/series';
	import type { SeriesDetail, SeriesType, SeriesStatus } from '$lib/types';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		series: SeriesDetail;
	};

	let { open = $bindable(false), series }: Props = $props();

	const updateMutation = createSeriesUpdateMutation();

	let shortName = $state(series.shortName);
	let fullName = $state(series.fullName);
	let seriesType = $state<SeriesType>(series.type);
	let status = $state<SeriesStatus>(series.status);
	let publisher = $state(series.publisher || '');
	let watchlist = $state(series.watchlist);
	// Latest volume known to be released (Hitlist → Confirmed new volumes); blank = unknown
	let released = $state(''); // synced from the series by the $effect below

	$effect(() => {
		shortName = series.shortName;
		fullName = series.fullName;
		seriesType = series.type;
		status = series.status;
		publisher = series.publisher || '';
		watchlist = series.watchlist;
		released = series.totalVolumes === null ? '' : String(series.totalVolumes);
	});

	function handleSubmit() {
		if (!shortName.trim() || !fullName.trim()) {
			toast.error('Short name and full name are required');
			return;
		}
		const releasedText = String(released).trim();
		const totalVolumes = releasedText === '' ? null : Number(releasedText);
		if (totalVolumes !== null && !(Number.isInteger(totalVolumes) && totalVolumes >= 1)) {
			toast.error('Released up to: a whole volume number, or leave it blank');
			return;
		}

		updateMutation.mutate(
			{
				id: series.id,
				shortName: shortName.trim(),
				fullName: fullName.trim(),
				type: seriesType,
				status,
				publisher: publisher.trim() || undefined,
				watchlist,
				totalVolumes
			},
			{
				onSuccess: () => {
					toast.success('Series updated');
					open = false;
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Series</Dialog.Title>
			<Dialog.Description>Update metadata for "{series.shortName}".</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="edit-short">Short Name</Label>
				<Input id="edit-short" bind:value={shortName} />
			</div>
			<div class="space-y-2">
				<Label for="edit-full">Full Name</Label>
				<Input id="edit-full" bind:value={fullName} />
			</div>
			<div class="space-y-2">
				<Label>Type</Label>
				<RadioGroup.Root bind:value={seriesType} class="flex gap-4">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="manga" id="edit-type-manga" />
						<Label for="edit-type-manga" class="font-normal">Manga</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="light_novel" id="edit-type-ln" />
						<Label for="edit-type-ln" class="font-normal">Light Novel</Label>
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
				<Label for="edit-publisher">Publisher</Label>
				<PublisherInput id="edit-publisher" bind:value={publisher} />
			</div>
			<div class="space-y-2">
				<Label for="edit-released">Released up to vol.</Label>
				<Input
					id="edit-released"
					bind:value={released}
					inputmode="numeric"
					placeholder="Unknown"
					class="w-32"
				/>
				<p class="text-xs text-muted-foreground">
					The latest volume known to be out. Past what you own, it's listed under "Confirmed new
					volumes" on the Field Mode Hitlist.
				</p>
			</div>
			<div class="flex items-center justify-between">
				<Label for="edit-watchlist" class="text-sm font-normal">Watchlist</Label>
				<Switch id="edit-watchlist" bind:checked={watchlist} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={updateMutation.isPending}>
				{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
