<script lang="ts">
	// "Bought" — swipe a Hitlist row left: which volumes you just bought (the next one
	// preselected; gaps, the confirmed ones and "+ more" to tap), the price each and
	// where they go. Same rules and request as Find's Select several: source / fair /
	// today from the chip, one batch with `onlyIfMissing`, one Undo. Nothing is saved
	// until Save, so a stray swipe at a booth is harmless.
	import * as Sheet from '$lib/components/ui/sheet';
	import { LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import LocationToggle from '$lib/components/field/LocationToggle.svelte';
	import { createMultiAddMutation, createUndoAddMutation } from '$lib/queries/field';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		addVolumes,
		boughtChoices,
		lastPrice,
		parsePrice,
		purchaseFields,
		toggleVolume,
		volumeRanges,
		type HitlistItem
	} from '$lib/field/logic';
	import type { BookListItem, SeriesListItem } from '$lib/types';

	let {
		item = $bindable(),
		books
	}: {
		/** The row swiped; null = closed */
		item: HitlistItem<SeriesListItem> | null;
		books: readonly BookListItem[];
	} = $props();

	const settings = getFieldSettings();
	const bookfairsQuery = createBookfairsListQuery();
	const multiAdd = createMultiAddMutation();
	const undoAdd = createUndoAddMutation();

	let selection = $state<number[]>([]);
	let showMore = $state(false);
	let priceText = $state('');

	const choices = $derived(item ? boughtChoices(item) : null);
	const fairName = $derived(
		settings.fairId === null
			? null
			: ((bookfairsQuery.data ?? []).find((f) => f.id === settings.fairId)?.name ?? 'the fair')
	);
	const price = $derived(parsePrice(priceText));
	const busy = $derived(multiAdd.isPending);
	const canSave = $derived(settings.ready && !busy && price !== null && selection.length > 0);

	// Each opening starts fresh: the next volume picked, the series' last price
	$effect(() => {
		if (!item) return;
		const current = item;
		selection = boughtChoices(current).preset;
		showMore = false;
		const p = lastPrice(books.filter((b) => b.seriesId === current.series.id));
		priceText = p === null ? '' : String(p);
	});

	function close() {
		item = null;
	}

	async function save() {
		if (!item || !canSave || price === null) return;
		const series = item.series;
		const volumes = [...selection];
		try {
			const result = await multiAdd.mutateAsync({
				series,
				books: volumes.map((volumeNumber) => ({
					seriesId: series.id,
					volumeNumber,
					isExtra: false,
					location: settings.location,
					price,
					...purchaseFields(settings.fairId, settings.today),
					isDraft: false
				}))
			});
			const added = result.books.map((b) => Number(b.volumeNumber));
			const skipped = result.skipped.map((b) => Number(b.volumeNumber));
			const already = skipped.length > 0 ? `already had vol. ${volumeRanges(skipped)}` : '';
			close();
			if (added.length > 0) {
				const ids = result.books.map((b) => b.id);
				toast.success(`Added vol. ${volumeRanges(added)}`, {
					description: [series.shortName, already].filter(Boolean).join(' · '),
					duration: 6000,
					action: { label: 'Undo', onClick: () => undo(ids, series.id, added) }
				});
			} else {
				toast.warning(`Nothing added — ${already}`, { description: series.shortName });
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add the books');
		}
	}

	async function undo(bookIds: number[], seriesId: number, volumes: number[]) {
		const label = `vol. ${volumeRanges(volumes)}`;
		try {
			await undoAdd.mutateAsync({ bookIds, seriesId });
			toast(`Removed ${label}`);
		} catch {
			toast.error(`Couldn't undo ${label} — remove it on the desktop`);
		}
	}

	const chip =
		'flex h-11 min-w-12 items-center justify-center rounded-xl border px-3 text-base font-semibold tabular-nums transition-colors';
	const shortcut =
		'h-9 rounded-full border border-border px-3 text-sm font-medium text-foreground active:bg-accent';
</script>

<Sheet.Root bind:open={() => item !== null, (v) => !v && close()}>
	<Sheet.Content side="bottom" class="max-h-[88dvh] gap-0 rounded-t-2xl p-0">
		{#if item && choices}
			<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
				<Sheet.Title class="text-base">Bought · {item.series.shortName}</Sheet.Title>
				<Sheet.Description class="text-xs">
					{fairName ? `At ${fairName}` : 'Not at a fair (bookstore)'} · today
				</Sheet.Description>
			</Sheet.Header>
			<div class="space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				<div class="space-y-2">
					<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Volumes</p>
					<div class="flex flex-wrap gap-2" role="group" aria-label="Volumes bought">
						{#each choices.missing as v (`m${v}`)}
							{@const on = selection.includes(v)}
							<button
								type="button"
								aria-pressed={on}
								aria-label="Vol. {v} (missing)"
								onclick={() => (selection = toggleVolume(selection, v))}
								class="{chip} {on
									? 'border-foreground bg-foreground text-background'
									: 'border-dashed border-red-400 text-foreground'}">{v}</button
							>
						{/each}
						{#each [...choices.fresh, ...(showMore ? choices.more : [])] as v (`f${v}`)}
							{@const on = selection.includes(v)}
							<button
								type="button"
								aria-pressed={on}
								aria-label="Vol. {v}{item.confirmedTo !== null && v <= item.confirmedTo
									? ' (released)'
									: ''}"
								onclick={() => (selection = toggleVolume(selection, v))}
								class="{chip} {on
									? 'border-foreground bg-foreground text-background'
									: 'border-border text-foreground'}">{v}</button
							>
						{/each}
						{#if !showMore}
							<button
								type="button"
								onclick={() => (showMore = true)}
								class="{chip} border-dashed border-border text-sm font-medium text-muted-foreground"
								>+ more</button
							>
						{/if}
					</div>
					{#if choices.missing.length > 0 || choices.fresh.length > 1}
						<div class="flex flex-wrap gap-2">
							{#if choices.missing.length > 0}
								<button
									type="button"
									class={shortcut}
									onclick={() => (selection = addVolumes(selection, choices.missing))}
									>All missing</button
								>
							{/if}
							{#if choices.fresh.length > 1}
								<button
									type="button"
									class={shortcut}
									onclick={() => (selection = addVolumes(selection, choices.fresh))}
									>All new ({volumeRanges(choices.fresh)})</button
								>
							{/if}
						</div>
					{/if}
					{#if choices.missing.length > 0}
						<p class="text-xs text-muted-foreground">Dashed red = missing below what you own.</p>
					{/if}
				</div>

				<div class="flex items-end gap-2">
					<label class="min-w-0 flex-1">
						<span class="text-xs text-muted-foreground">Price each ฿</span>
						<input
							bind:value={priceText}
							inputmode="decimal"
							autocomplete="off"
							placeholder="optional"
							class="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-lg tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
						/>
					</label>
					<LocationToggle {settings} />
				</div>
				{#if price === null}
					<p class="text-xs text-destructive">Type a price as a number, or leave it empty.</p>
				{/if}

				<button
					type="button"
					disabled={!canSave}
					onclick={save}
					class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-40"
				>
					{#if busy}<LoaderCircle class="h-5 w-5 animate-spin" />{/if}
					{selection.length === 0
						? 'Pick a volume'
						: `Save · ${selection.length === 1 ? `vol. ${selection[0]}` : `${selection.length} volumes`}`}
				</button>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
