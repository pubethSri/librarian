<script lang="ts">
	// Find → "+ Extra": add one or more extras (side story, short-story
	// collection…) to the open series, each with its title. They come after a
	// regular volume (latest owned by default); the sort positions are worked
	// out (`extraPlan`: 8.5, 8.6…). When that volume isn't owned yet, "Add vol. N
	// too" saves it with them — a set bought together. One batch request with
	// `onlyIfMissing`, dated today with the fair chip, one Undo.
	import { untrack } from 'svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ExtraRows from '$lib/components/field/ExtraRows.svelte';
	import LocationToggle from '$lib/components/field/LocationToggle.svelte';
	import { createMultiAddMutation, createUndoAddMutation } from '$lib/queries/field';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		addedSummary,
		extraPlan,
		extraPlanLabel,
		parsePrice,
		purchaseFields,
		usedTitles,
		volumeRanges,
		type OwnedVolumes
	} from '$lib/field/logic';
	import type { BookListItem, SeriesListItem } from '$lib/types';

	let {
		open = $bindable(),
		series,
		owned,
		books,
		price: startPrice
	}: {
		open: boolean;
		series: SeriesListItem;
		owned: OwnedVolumes;
		/** Every book (title suggestions); the series' own are picked out */
		books: readonly BookListItem[];
		/** The price typed in Find, as text */
		price: string;
	} = $props();

	const settings = getFieldSettings();
	const multiAdd = createMultiAddMutation();
	const undoAdd = createUndoAddMutation();

	let after = $state(0);
	let titles = $state<string[]>(['']);
	let withVolume = $state(true);
	let priceText = $state('');

	const seriesBooks = $derived(books.filter((b) => b.seriesId === series.id));
	const suggestions = $derived(usedTitles(books));
	/** The volume they follow isn't owned (a set bought with it?) */
	const volumeMissing = $derived(
		after >= 1 && !seriesBooks.some((b) => !b.isExtra && Number(b.volumeNumber) === after)
	);
	const plan = $derived(extraPlan(seriesBooks, after, titles, withVolume && volumeMissing));
	const price = $derived(parsePrice(priceText));
	const busy = $derived(multiAdd.isPending);
	const canSave = $derived(settings.ready && !busy && price !== null && plan !== null);

	// Each opening starts fresh: after the latest volume, one empty row (a
	// refetch while open must not wipe what's typed)
	$effect(() => {
		if (!open) return;
		untrack(() => {
			after = owned.latest;
			titles = [''];
			withVolume = true;
			priceText = startPrice;
		});
	});

	async function save() {
		if (!canSave || !plan || price === null) return;
		const target = series;
		try {
			const result = await multiAdd.mutateAsync({
				series: target,
				books: plan.map((b) => ({
					seriesId: target.id,
					volumeNumber: b.volumeNumber,
					isExtra: b.isExtra,
					title: b.title,
					location: settings.location,
					price,
					...purchaseFields(settings.fairId, settings.today),
					isDraft: false
				}))
			});
			const skipped = result.skipped.map((b) => Number(b.volumeNumber));
			const already = skipped.length > 0 ? `already had vol. ${volumeRanges(skipped)}` : '';
			open = false;
			if (result.books.length > 0) {
				const ids = result.books.map((b) => b.id);
				const what = addedSummary(result.books);
				toast.success(`Added ${what}`, {
					description: [target.shortName, already].filter(Boolean).join(' · '),
					duration: 6000,
					action: { label: 'Undo', onClick: () => undo(ids, target.id, what) }
				});
			} else {
				toast.warning(`Nothing added — ${already}`, { description: target.shortName });
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add the extras');
		}
	}

	async function undo(bookIds: number[], seriesId: number, what: string) {
		try {
			await undoAdd.mutateAsync({ bookIds, seriesId });
			toast(`Removed ${what}`);
		} catch {
			toast.error(`Couldn't undo ${what} — remove it on the desktop`);
		}
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="bottom" class="max-h-[92dvh] gap-0 rounded-t-2xl p-0">
		<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
			<Sheet.Title class="text-base">Add an extra</Sheet.Title>
			<Sheet.Description class="text-xs">
				{series.shortName} · side story, short-story collection…
			</Sheet.Description>
		</Sheet.Header>
		<div class="space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
			<div class="space-y-2">
				<p class="text-xs font-semibold text-muted-foreground">Comes after</p>
				<ExtraRows bind:after bind:titles {suggestions} max={owned.next} />
			</div>

			{#if volumeMissing}
				<label
					class="flex min-h-13 items-center gap-3 rounded-xl border border-highlight/30 bg-highlight-soft px-3 py-2"
				>
					<input type="checkbox" bind:checked={withVolume} class="h-5 w-5 accent-foreground" />
					<span class="text-sm text-foreground">
						<span class="font-semibold">Add vol. {after} too</span>
						<span class="block text-xs text-highlight-ink"
							>You don't have it yet — bought as a set?</span
						>
					</span>
				</label>
			{/if}

			{#if plan === null}
				<p class="text-sm text-destructive">
					No room for more extras after vol. {after} — add them on the desktop.
				</p>
			{/if}

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
				class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-40"
			>
				{#if busy}<LoaderCircle class="h-5 w-5 animate-spin" />{/if}
				Save · {plan ? extraPlanLabel(plan) : 'no room'}
			</button>
		</div>
	</Sheet.Content>
</Sheet.Root>
