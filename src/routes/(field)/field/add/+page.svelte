<script lang="ts">
	// Add tab: a series not in the collection yet. Type its name → existing
	// matches first (tap = open it in Find); else create it with its first
	// volume as a draft, finished later on the desktop.
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { CirclePlus, LoaderCircle, Minus, Plus, X } from '@lucide/svelte';
	import LocationToggle from '$lib/components/field/LocationToggle.svelte';
	import TypeBadge from '$lib/components/TypeBadge.svelte';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createSeriesWithFirstVolumeMutation } from '$lib/queries/field';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		normalize,
		parsePrice,
		parseVolume,
		purchaseFields,
		searchSeries
	} from '$lib/field/logic';
	import { SERIES_TYPE_LABELS, type SeriesType } from '$lib/types';

	const settings = getFieldSettings();
	const seriesQuery = createSeriesListQuery({ fresh: true });
	const create = createSeriesWithFirstVolumeMutation();

	let name = $state('');
	let creating = $state(false);
	let type = $state<SeriesType | null>(null);
	let volumeText = $state('1');
	let priceText = $state('');
	let saving = $state(false);

	const trimmed = $derived(name.trim());
	const matches = $derived(searchSeries(seriesQuery.data ?? [], trimmed, 5));
	/** Same name, ignoring case and punctuation: almost certainly a duplicate */
	const sameName = $derived(
		matches.find(
			(s) =>
				normalize(s.shortName) === normalize(trimmed) ||
				normalize(s.fullName) === normalize(trimmed)
		) ?? null
	);
	const volume = $derived(parseVolume(volumeText));
	const price = $derived(parsePrice(priceText));
	const canSave = $derived(
		!!trimmed && type !== null && volume !== null && price !== null && settings.ready && !saving
	);

	const TYPES: SeriesType[] = ['light_novel', 'manga'];

	function step(by: number) {
		const n = Math.max(1, Math.floor(volume ?? 1) + by);
		volumeText = String(n);
	}

	function clearName() {
		name = '';
		creating = false;
	}

	async function save() {
		if (!canSave || type === null || volume === null || price === null) return;
		saving = true;
		try {
			const { series } = await create.mutateAsync({
				series: { shortName: trimmed, fullName: trimmed, type },
				book: {
					volumeNumber: volume,
					isExtra: false,
					location: settings.location,
					price,
					...purchaseFields(settings.fairId, settings.today),
					isDraft: true
				}
			});
			toast.success(`Created ${series.shortName}`, {
				description: `Vol. ${volume} saved as a draft — finish it on the desktop`
			});
			goto(resolve(`/field?series=${series.id}`));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create the series');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Add — Field Mode</title>
</svelte:head>

<div class="mx-auto max-w-md">
	<h1 class="px-1 pb-2 text-lg font-semibold text-foreground">Add a new series</h1>

	<label class="relative block">
		<span class="sr-only">Series name</span>
		<input
			bind:value={name}
			type="text"
			autocomplete="off"
			autocapitalize="words"
			spellcheck="false"
			placeholder="Series name"
			class="h-14 w-full rounded-xl border border-input bg-background pr-12 pl-4 text-lg outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
		/>
		{#if name}
			<button
				type="button"
				onclick={clearName}
				class="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
				aria-label="Clear"
			>
				<X class="h-5 w-5" />
			</button>
		{/if}
	</label>

	{#if !trimmed}
		<p class="px-1 pt-3 text-sm text-muted-foreground">
			Type the name as it's printed on the cover. If you already have it, it shows up here first.
		</p>
	{:else}
		{#if matches.length > 0}
			<p class="px-1 pt-4 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Already in the collection
			</p>
			<ul class="space-y-2">
				{#each matches as s (s.id)}
					<li>
						<a
							href={resolve(`/field?series=${s.id}`)}
							class="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-left transition-colors active:bg-accent"
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-base font-medium text-foreground">
									{s.shortName}
								</span>
								{#if s.fullName !== s.shortName}
									<span class="block truncate text-xs text-muted-foreground">{s.fullName}</span>
								{/if}
							</span>
							<TypeBadge type={s.type} />
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if !creating}
			<button
				type="button"
				onclick={() => (creating = true)}
				class="mt-4 flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-dashed border-foreground/30 px-4 text-left active:bg-accent"
			>
				<CirclePlus class="h-5 w-5 shrink-0" />
				<span class="min-w-0 flex-1 truncate text-base font-medium text-foreground">
					Create “{trimmed}”
				</span>
			</button>
			{#if sameName}
				<p class="px-1 pt-2 text-xs text-muted-foreground">
					“{sameName.shortName}” already exists — tap it above instead.
				</p>
			{/if}
		{:else}
			<div class="mt-4 space-y-5 rounded-2xl border border-border p-4">
				<p class="text-base font-semibold text-foreground">New: {trimmed}</p>

				<div>
					<p class="mb-1.5 text-xs font-medium text-muted-foreground">Type</p>
					<div role="radiogroup" aria-label="Type" class="grid grid-cols-2 gap-2">
						{#each TYPES as t (t)}
							<button
								type="button"
								role="radio"
								aria-checked={type === t}
								onclick={() => (type = t)}
								class="h-14 rounded-xl border text-base font-semibold transition-colors {type === t
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input text-foreground active:bg-accent'}"
							>
								{SERIES_TYPE_LABELS[t]}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex items-end gap-3">
					<div>
						<p class="mb-1.5 text-xs font-medium text-muted-foreground">First volume</p>
						<div class="flex h-12 items-center rounded-xl border border-input">
							<button
								type="button"
								onclick={() => step(-1)}
								class="flex h-full w-11 items-center justify-center text-muted-foreground active:bg-accent"
								aria-label="One less"
							>
								<Minus class="h-4 w-4" />
							</button>
							<input
								bind:value={volumeText}
								type="text"
								inputmode="decimal"
								aria-label="First volume number"
								aria-invalid={volume === null}
								class="h-full w-12 bg-transparent text-center font-mono text-lg tabular-nums outline-none aria-invalid:text-destructive"
							/>
							<button
								type="button"
								onclick={() => step(1)}
								class="flex h-full w-11 items-center justify-center text-muted-foreground active:bg-accent"
								aria-label="One more"
							>
								<Plus class="h-4 w-4" />
							</button>
						</div>
					</div>
					<label class="min-w-0 flex-1">
						<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Price ฿</span>
						<input
							bind:value={priceText}
							type="text"
							inputmode="decimal"
							autocomplete="off"
							placeholder="none"
							aria-invalid={price === null}
							class="h-12 w-full rounded-xl border border-input bg-background px-3 font-mono text-lg tabular-nums outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 aria-invalid:border-destructive"
						/>
					</label>
				</div>

				<div>
					<p class="mb-1.5 text-xs font-medium text-muted-foreground">Location</p>
					<LocationToggle {settings} />
				</div>

				{#if volume === null || price === null}
					<p class="text-xs text-destructive">
						{volume === null ? 'Volume: a number like 1 or 4.5. ' : ''}{price === null
							? 'Price: digits only, e.g. 175.'
							: ''}
					</p>
				{/if}

				<button
					type="button"
					onclick={save}
					disabled={!canSave}
					class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
				>
					{#if saving}<LoaderCircle class="h-5 w-5 animate-spin" />{/if}
					{type === null ? 'Pick a type' : 'Save'}
				</button>
				<p class="text-center text-xs text-muted-foreground">
					Saved as a draft — publisher, tags and the rest on the desktop.
				</p>
			</div>
		{/if}
	{/if}
</div>
