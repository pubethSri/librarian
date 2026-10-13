<script lang="ts">
	import { untrack } from 'svelte';
	import SeriesSearch from '$lib/components/forms/SeriesSearch.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { expandVolumeRange, nextVolumeFor } from '$lib/console/logic';
	import type { StagingStore } from '$lib/console/staging.svelte';
	import type { BookfairDefaults } from '$lib/console/types';
	import type { BookListItem, SeriesListItem } from '$lib/types';

	let {
		books,
		staging,
		defaults,
		initialSeriesId
	}: {
		/** Books in the current scope — used for de-duplication and volume suggestion */
		books: BookListItem[];
		staging: StagingStore;
		/** Bookfair-scope field defaults, or null outside a bookfair scope */
		defaults: BookfairDefaults | null;
		initialSeriesId: number | null;
	} = $props();

	// Read once at init: the form deliberately does not resync when the scope
	// changes later, matching the original behavior.
	let selectedSeriesId = $state<number | null>(untrack(() => initialSeriesId));
	let selectedSeriesName = $state('');
	let volumeFrom = $state<number>(1);
	let volumeTo = $state<number>(1);
	let batchPrice = $state<string>('');

	function handleSeriesSelect(series: SeriesListItem) {
		selectedSeriesId = series.id;
		selectedSeriesName = series.shortName;
		// Auto-set volumeFrom to next volume
		const next = nextVolumeFor(books, staging.entries, series.id);
		volumeFrom = next;
		volumeTo = next;
	}

	function addToPreview() {
		const result = expandVolumeRange({
			seriesId: selectedSeriesId,
			seriesName: selectedSeriesName,
			volumeFrom,
			volumeTo,
			price: batchPrice,
			defaults,
			existing: books,
			staged: staging.entries
		});

		if (!result.ok) {
			toast.error(result.error);
			return;
		}

		for (const message of result.skipped) toast.error(message);

		if (result.entries.length > 0) {
			const added = result.entries.length;
			staging.add(result.entries);
			toast.success(`Added ${added} volume${added > 1 ? 's' : ''} to preview`);
			// Reset volume range for next batch
			volumeFrom = volumeTo + 1;
			volumeTo = volumeFrom;
		}
	}
</script>

<div class="space-y-5">
	<!-- Bookfair context banner -->
	{#if defaults}
		<div
			class="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
		>
			<p>
				<span class="font-medium text-foreground">Bookfair mode:</span> Source, location, and date are
				pre-filled from the event.
			</p>
		</div>
	{/if}

	<!-- Series picker -->
	<div class="space-y-2">
		<Label>Series</Label>
		<SeriesSearch value={selectedSeriesId} onselect={handleSeriesSelect} />
	</div>

	<!-- Volume range -->
	<div class="space-y-2">
		<Label>Volumes</Label>
		<div class="flex items-center gap-2">
			<Input
				type="number"
				min="1"
				step="1"
				bind:value={volumeFrom}
				class="h-9 w-20 tabular-nums"
				placeholder="From"
			/>
			<span class="text-sm text-muted-foreground">to</span>
			<Input
				type="number"
				min="1"
				step="1"
				bind:value={volumeTo}
				class="h-9 w-20 tabular-nums"
				placeholder="To"
			/>
			{#if volumeTo > volumeFrom}
				<Badge variant="secondary" class="text-xs">
					{volumeTo - volumeFrom + 1} vols
				</Badge>
			{/if}
		</div>
	</div>

	<!-- Price -->
	<div class="space-y-2">
		<Label for="console-price">Price (each)</Label>
		<Input
			id="console-price"
			type="number"
			step="0.01"
			min="0"
			placeholder="Optional — applies to all"
			bind:value={batchPrice}
			class="h-9"
		/>
	</div>

	<!-- Add button -->
	<Button class="w-full gap-1.5" onclick={addToPreview}>
		<Plus class="h-3.5 w-3.5" />
		Add to Preview
	</Button>
</div>
