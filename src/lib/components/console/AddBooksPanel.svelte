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
	import type { BookfairDefaults, PurchaseFields } from '$lib/console/types';
	import * as Select from '$lib/components/ui/select';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import {
		BOOK_LOCATION_LABELS,
		type BookListItem,
		type BookLocation,
		type BookSource,
		type SeriesListItem
	} from '$lib/types';

	let {
		ownedBooks,
		staging,
		defaults,
		initialSeriesId
	}: {
		/**
		 * Every owned book, regardless of scope — used for de-duplication and the
		 * next-volume suggestion, so a series owned outside the scope still counts
		 */
		ownedBooks: BookListItem[];
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
	let batchPrice = $state<string | number | null>('');
	let location = $state<BookLocation>('apartment');

	// Source + purchase date, outside a bookfair scope (inside it they come from
	// the fair). Kept between batches: a run from one store needs one setup.
	// The date starts empty ("unknown") — a default of today would mis-date
	// every backfilled book.
	const bookfairsQuery = createBookfairsListQuery();
	let source = $state<BookSource | ''>('');
	let sourceEventId = $state<number | null>(null);
	let boughtAt = $state('');

	const formFields = $derived<PurchaseFields>({
		source: source || undefined,
		sourceEventId: source === 'bookfair' ? (sourceEventId ?? undefined) : undefined,
		boughtAt: boughtAt || undefined
	});

	function pickFair(id: string) {
		sourceEventId = id ? Number(id) : null;
		const fair = bookfairsQuery.data?.find((bf) => bf.id === sourceEventId);
		if (fair) boughtAt = fair.date;
	}

	function today(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function handleSeriesSelect(series: SeriesListItem) {
		selectedSeriesId = series.id;
		selectedSeriesName = series.shortName;
		// Auto-set volumeFrom to next volume
		const next = nextVolumeFor(ownedBooks, staging.entries, series.id);
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
			location,
			defaults: defaults ?? formFields,
			existing: ownedBooks,
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
				<span class="font-medium text-foreground">Bookfair mode:</span> Source and date are pre-filled
				from the event.
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

	<!-- Location -->
	<div class="space-y-2">
		<Label>Location</Label>
		<div class="grid grid-cols-2 gap-2">
			{#each ['apartment', 'home'] as const as loc (loc)}
				<Button
					type="button"
					variant={location === loc ? 'default' : 'outline'}
					class="h-9"
					aria-pressed={location === loc}
					onclick={() => (location = loc)}
				>
					{BOOK_LOCATION_LABELS[loc]}
				</Button>
			{/each}
		</div>
	</div>

	{#if !defaults}
		<!-- Source -->
		<div class="space-y-2">
			<Label>Source</Label>
			<Select.Root type="single" bind:value={source} onValueChange={() => (sourceEventId = null)}>
				<Select.Trigger class="w-full">
					{source === 'bookstore'
						? 'Bookstore'
						: source === 'bookfair'
							? 'Bookfair'
							: source === 'online'
								? 'Online'
								: 'Optional'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="None" />
					<Select.Item value="bookstore" label="Bookstore" />
					<Select.Item value="bookfair" label="Bookfair" />
					<Select.Item value="online" label="Online" />
				</Select.Content>
			</Select.Root>
			{#if source === 'bookfair'}
				<Select.Root
					type="single"
					value={sourceEventId ? String(sourceEventId) : ''}
					onValueChange={pickFair}
				>
					<Select.Trigger class="w-full">
						{bookfairsQuery.data?.find((bf) => bf.id === sourceEventId)?.name ?? 'Which bookfair?'}
					</Select.Trigger>
					<Select.Content>
						{#each bookfairsQuery.data ?? [] as bf (bf.id)}
							<Select.Item value={String(bf.id)} label={bf.name} />
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
		</div>

		<!-- Purchase date -->
		<div class="space-y-2">
			<Label for="console-bought-at">Purchase Date</Label>
			<div class="flex items-center gap-2">
				<Input id="console-bought-at" type="date" bind:value={boughtAt} class="h-9" />
				<Button
					type="button"
					variant="outline"
					class="h-9 shrink-0"
					onclick={() => (boughtAt = today())}
				>
					Today
				</Button>
			</div>
			{#if !boughtAt}
				<p class="text-xs text-muted-foreground">Empty = date unknown.</p>
			{/if}
		</div>
	{/if}

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
