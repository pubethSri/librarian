<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBooksListQuery } from '$lib/queries/books';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import TypeBadge from '$lib/components/TypeBadge.svelte';
	import LocationToggle from '$lib/components/field/LocationToggle.svelte';
	import VolumeReadingSheet from '$lib/components/field/VolumeReadingSheet.svelte';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		BookOpen,
		Check,
		ListChecks,
		ListOrdered,
		LoaderCircle,
		Megaphone,
		Minus,
		Plus,
		Search,
		Star,
		X
	} from '@lucide/svelte';
	import {
		addVolumes,
		groupBySeries,
		lastPrice,
		nextRun,
		normalizeReleased,
		ownedVolumes,
		parsePrice,
		pickableVolumes,
		purchaseFields,
		searchSeries,
		toggleVolume,
		volumeRanges,
		volumeSpan,
		withReleased,
		type OwnedVolumes,
		type VolumeSlot
	} from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		AlreadyAddedError,
		createMultiAddMutation,
		createQuickAddMutation,
		createReleasedMutation,
		createUndoAddMutation
	} from '$lib/queries/field';
	import {
		BOOK_LOCATION_LABELS,
		SERIES_STATUS_LABELS,
		type BookLocation,
		type SeriesListItem
	} from '$lib/types';

	// Fresh: a phone at the fair must see what the laptop added a minute ago
	const seriesQuery = createSeriesListQuery({ fresh: true });
	const booksQuery = createBooksListQuery({ fresh: true });

	let query = $state('');
	let input = $state<HTMLInputElement | null>(null);

	// The open series lives in the URL, so the phone's back button returns to the results
	const selectedId = $derived(Number(page.url.searchParams.get('series')) || null);

	const booksBySeries = $derived(groupBySeries(booksQuery.data ?? []));

	const allSeries = $derived(seriesQuery.data ?? []);
	const results = $derived(searchSeries(allSeries, query));
	const watchlist = $derived(
		allSeries.filter((s) => s.watchlist).sort((a, b) => a.shortName.localeCompare(b.shortName))
	);

	const selected = $derived(
		selectedId === null ? null : (allSeries.find((s) => s.id === selectedId) ?? null)
	);
	const owned = $derived(selected ? ownedVolumes(booksBySeries.get(selected.id) ?? []) : null);

	const loading = $derived(seriesQuery.isPending || booksQuery.isPending);

	/** The owned tile whose reading sheet is open */
	let readingSlot = $state<VolumeSlot | null>(null);

	// ─── Quick add ──────────────────────────────────────────────────────────
	const settings = getFieldSettings();
	const quickAdd = createQuickAddMutation();
	const multiAdd = createMultiAddMutation();
	const undoAdd = createUndoAddMutation();

	let priceText = $state('');
	let pricedFor = $state<number | null>(null);
	/** The volume being saved (BATCH for a multi-add); one add at a time */
	let pending = $state<number | null>(null);
	const BATCH = -1;

	// Select several: gaps + volumes ahead, added in one request
	let selecting = $state(false);
	let selection = $state<number[]>([]);
	let ahead = $state(12);
	const RUNS = [3, 5, 10];
	const futureVolumes = $derived(
		owned ? pickableVolumes(owned, ahead).filter((v) => v >= owned.next) : []
	);

	const price = $derived(parsePrice(priceText));
	const canAdd = $derived(settings.ready && pending === null && price !== null);

	// Pre-fill the price once per opened series — a typed price survives refetches
	$effect(() => {
		if (!selected || loading || pricedFor === selected.id) return;
		pricedFor = selected.id;
		selecting = false;
		selection = [];
		ahead = 12;
		const p = lastPrice(booksBySeries.get(selected.id) ?? []);
		priceText = p === null ? '' : String(p);
	});

	async function add(volume: number) {
		if (!selected || !canAdd || price === null) return;
		const series = selected;
		pending = volume;
		try {
			const book = await quickAdd.mutateAsync({
				series,
				payload: {
					seriesId: series.id,
					volumeNumber: volume,
					isExtra: false,
					location: settings.location,
					price,
					...purchaseFields(settings.fairId, settings.today),
					isDraft: false
				}
			});
			toast.success(`Added Vol. ${volume}`, {
				description: series.shortName,
				duration: 6000,
				action: { label: 'Undo', onClick: () => undo([book.id], series.id, [volume]) }
			});
		} catch (err) {
			if (err instanceof AlreadyAddedError) {
				toast.warning(`Vol. ${volume} was just added on another device`, {
					description: series.shortName
				});
			} else {
				toast.error(err instanceof Error ? err.message : 'Failed to add the book');
			}
		} finally {
			pending = null;
		}
	}

	async function addSelected() {
		if (!selected || !canAdd || price === null || selection.length === 0) return;
		const series = selected;
		const volumes = [...selection];
		pending = BATCH;
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
			selection = [];
			selecting = false;
			const already = skipped.length > 0 ? `already had vol. ${volumeRanges(skipped)}` : '';
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
		} finally {
			pending = null;
		}
	}

	function toggleSelecting() {
		selecting = !selecting;
		selection = [];
		ahead = 12;
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

	// ─── Released up to vol. N (Hitlist → Confirmed new volumes) ────────────
	const queryClient = useQueryClient();
	const releasedMutation = createReleasedMutation();
	let releasedTimer: ReturnType<typeof setTimeout> | undefined;

	/** Show it at once; save once the taps stop (one PATCH for several taps) */
	function setReleased(value: number | null) {
		if (!selected) return;
		const seriesId = selected.id;
		const released = normalizeReleased(value);
		queryClient.setQueryData<SeriesListItem[]>(['series'], (list) =>
			withReleased(list, seriesId, released)
		);
		clearTimeout(releasedTimer);
		releasedTimer = setTimeout(() => {
			releasedMutation.mutate(
				{ seriesId, released },
				{ onError: (err) => toast.error(err.message) }
			);
		}, 600);
	}

	function stepReleased(by: number) {
		if (!selected || !owned) return;
		const current = selected.totalVolumes;
		if (by > 0) setReleased(Math.max(current ?? owned.latest, owned.latest) + by);
		else setReleased(current === null ? null : current + by);
	}

	function ownedOf(seriesId: number): OwnedVolumes {
		return ownedVolumes(booksBySeries.get(seriesId) ?? []);
	}

	function open(seriesId: number) {
		goto(resolve(`/field?series=${seriesId}`));
	}

	function backToSearch() {
		// Opened from the results: step back in history; opened by link: go to /field
		if (history.length > 1) history.back();
		else goto(resolve('/field'));
	}

	function clearQuery() {
		query = '';
		input?.focus();
	}

	/** "A", "H", "A·H" — where the copies of a volume are */
	function locationLetters(locations: readonly BookLocation[]): string {
		return [...new Set(locations)].map((l) => BOOK_LOCATION_LABELS[l][0]).join('·');
	}

	/** "1–12", "1–12 · missing 3" for a result row */
	function ownedSummary(o: OwnedVolumes): string {
		if (o.total === 0) return 'Nothing owned';
		const range = o.latest > 0 ? (o.latest === 1 ? 'Vol. 1' : `Vol. 1–${o.latest}`) : '';
		const extras = o.extras.length > 0 ? `+${o.extras.length} extra` : '';
		const missing = o.missing.length > 0 ? `missing ${o.missing.join(', ')}` : '';
		return [range, extras, missing].filter(Boolean).join(' · ');
	}

	function slotTitle(slot: VolumeSlot): string {
		const name = volumeText({ volumeNumber: slot.volume, isExtra: slot.isExtra });
		if (slot.copies === 0) return `${name}: not owned`;
		const where = slot.locations.map((l) => BOOK_LOCATION_LABELS[l]).join(', ');
		const state = slot.status === 'reading' ? ' · reading' : slot.read ? ' · read' : '';
		return `${name}: ${where}${state}`;
	}
</script>

<svelte:head>
	<title>Field Mode — Librarian</title>
</svelte:head>

<div class="mx-auto max-w-md">
	{#if selectedId === null}
		<!-- ─── Search ─────────────────────────────────────────────────────── -->
		<!-- Full-bleed Stone strip: hides rows scrolling under the box without a visible card edge -->
		<div
			class="sticky top-12 z-20 mx-[calc(50%-50vw)] bg-(--canvas)/95 px-[calc(50vw-50%)] pt-1 pb-3 backdrop-blur"
		>
			<h1 class="sr-only">Field Mode</h1>
			<label class="relative block">
				<span class="sr-only">Find a series</span>
				<Search
					class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
				/>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:this={input}
					bind:value={query}
					type="search"
					inputmode="search"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					autofocus
					placeholder="Do I own…?"
					class="h-14 w-full rounded-xl border border-input bg-background pr-12 pl-11 text-lg outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if query}
					<button
						type="button"
						onclick={clearQuery}
						class="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
						aria-label="Clear"
					>
						<X class="h-5 w-5" />
					</button>
				{/if}
			</label>
		</div>

		{#if loading}
			<div class="space-y-2">
				{#each Array(4) as _, i (i)}
					<Skeleton class="h-16 rounded-xl" />
				{/each}
			</div>
		{:else if seriesQuery.isError || booksQuery.isError}
			<p class="py-8 text-center text-sm text-destructive">
				Couldn't load the collection. Check the connection and pull to refresh.
			</p>
		{:else if query.trim()}
			{#if results.length === 0}
				<div class="py-10 text-center">
					<p class="text-lg font-medium text-foreground">Not in the collection</p>
					<p class="mt-1 text-sm text-muted-foreground">
						No series matches “{query.trim()}”.
					</p>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each results as s (s.id)}
						{@const o = ownedOf(s.id)}
						<li>
							<button
								type="button"
								onclick={() => open(s.id)}
								class="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors active:bg-accent"
							>
								<div class="min-w-0 flex-1">
									<p class="truncate text-base font-medium text-foreground">{s.shortName}</p>
									<p class="truncate text-xs text-muted-foreground">{ownedSummary(o)}</p>
								</div>
								<div class="shrink-0 text-right">
									<p class="text-[10px] tracking-wide text-muted-foreground uppercase">Next</p>
									<p class="font-mono text-xl font-semibold text-foreground tabular-nums">
										{o.next}
									</p>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<p class="px-1 pb-4 text-sm text-muted-foreground">
				Type 2–3 letters of a series — any word, or its initials.
			</p>
			{#if watchlist.length > 0}
				<p
					class="flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>
					<Star class="h-3.5 w-3.5" /> Watchlist
				</p>
				<ul class="space-y-2">
					{#each watchlist as s (s.id)}
						{@const o = ownedOf(s.id)}
						<li>
							<button
								type="button"
								onclick={() => open(s.id)}
								class="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-left transition-colors active:bg-accent"
							>
								<span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
									{s.shortName}
								</span>
								<span class="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
									next {o.next}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{:else}
		<!-- ─── One series ─────────────────────────────────────────────────── -->
		<button
			type="button"
			onclick={backToSearch}
			class="-ml-2 flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" /> Search
		</button>

		{#if loading}
			<Skeleton class="mt-3 h-24 rounded-xl" />
			<Skeleton class="mt-4 h-40 rounded-xl" />
		{:else if !selected || !owned}
			<p class="py-10 text-center text-sm text-muted-foreground">This series no longer exists.</p>
		{:else}
			<div class="mt-2 space-y-1">
				<div class="flex items-center gap-2">
					<TypeBadge type={selected.type} />
					<span class="text-xs text-muted-foreground">
						{SERIES_STATUS_LABELS[selected.status]}{selected.publisher
							? ` · ${selected.publisher}`
							: ''}
					</span>
				</div>
				<h1 class="text-2xl leading-tight font-semibold tracking-tight text-foreground">
					{selected.shortName}
				</h1>
				{#if selected.fullName !== selected.shortName}
					<p class="text-sm text-muted-foreground">{selected.fullName}</p>
				{/if}
			</div>

			<!-- The answer, big enough to read at arm's length -->
			<div
				class="mt-5 flex items-end justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground"
			>
				<div>
					<p class="text-xs font-medium tracking-wide uppercase opacity-70">Next to buy</p>
					<p class="font-mono text-5xl leading-none font-bold tabular-nums">Vol. {owned.next}</p>
				</div>
				<p class="pb-1 text-right text-sm opacity-80">
					{#if owned.total === 0}
						none owned
					{:else if owned.latest === 0}
						extras only
					{:else if owned.missing.length > 0}
						latest vol. {owned.latest}
					{:else}
						own 1–{owned.latest}
					{/if}
				</p>
			</div>

			{#if owned.missing.length > 0}
				<p
					class="mt-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-foreground"
				>
					<span class="font-medium">Missing:</span>
					<span class="font-mono tabular-nums">vol. {owned.missing.join(', ')}</span>
				</p>
			{/if}

			<!-- Quick add: price + location for the next tap -->
			<div class="mt-5 flex items-end gap-2">
				<label class="min-w-0 flex-1">
					<span class="mb-1 block text-xs font-medium text-muted-foreground">Price ฿</span>
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
				<LocationToggle {settings} />
			</div>
			<div class="mt-2 flex items-center gap-2">
				<p class="min-w-0 flex-1 text-xs text-muted-foreground">
					{#if price === null}
						<span class="text-destructive">Price: digits only, e.g. 175 or 89.50</span>
					{:else if selecting}
						Tap volumes to select, then add them together{price !== undefined
							? ` (฿${price} each)`
							: ''}.
					{:else}
						Tap <span class="font-semibold text-foreground">+</span> to add — saved at once, dated today.
					{/if}
				</p>
				<button
					type="button"
					onclick={toggleSelecting}
					aria-pressed={selecting}
					class="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors {selecting
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-input text-foreground active:bg-accent'}"
				>
					{#if selecting}<X class="h-4 w-4" /> Done{:else}<ListChecks class="h-4 w-4" /> Select several{/if}
				</button>
			</div>

			{#if selecting}
				<div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick select">
					{#each RUNS as n (n)}
						<button
							type="button"
							onclick={() => (selection = addVolumes(selection, nextRun(owned, n)))}
							class="h-9 rounded-full border border-border px-3 text-sm text-foreground active:bg-accent"
						>
							Next {n}
						</button>
					{/each}
					{#if selection.length > 0}
						<button
							type="button"
							onclick={() => (selection = [])}
							class="h-9 px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
						>
							Clear
						</button>
					{/if}
				</div>
			{/if}

			<ol class="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
				{#each owned.volumes as slot (slot.volume)}
					{#if slot.copies > 0}
						<!-- Owned tile: tap for the reading actions -->
						<li>
							<button
								type="button"
								title={slotTitle(slot)}
								onclick={() => (readingSlot = slot)}
								aria-label="Reading actions — {slotTitle(slot)}"
								class="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-border bg-card transition-colors active:bg-accent"
							>
								<span class="font-mono text-lg font-semibold tabular-nums">{slot.volume}</span>
								<span class="text-[10px] font-medium text-muted-foreground">
									{locationLetters(slot.locations)}{slot.copies > 1 ? ` ×${slot.copies}` : ''}
								</span>
								{#if slot.status === 'reading'}
									<BookOpen class="absolute top-1 left-1 h-3 w-3 text-sky-600 dark:text-sky-400" />
								{/if}
								{#if slot.read}
									<Check class="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
								{/if}
								{#if slot.queuedId !== null}
									<ListOrdered
										class="absolute right-1 bottom-1 h-3 w-3 text-sky-600 dark:text-sky-400"
									/>
								{/if}
							</button>
						</li>
					{:else}
						<li>
							{#if selecting}
								{@const on = selection.includes(slot.volume)}
								<button
									type="button"
									onclick={() => (selection = toggleVolume(selection, slot.volume))}
									aria-pressed={on}
									aria-label="Select vol. {slot.volume} (missing)"
									class="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border transition-colors {on
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-dashed border-foreground/30 text-muted-foreground'}"
								>
									<span class="font-mono text-lg font-semibold tabular-nums">{slot.volume}</span>
									<span class="text-[10px]">missing</span>
									{#if on}<Check class="absolute top-1 right-1 h-3.5 w-3.5" />{/if}
								</button>
							{:else}
								<button
									type="button"
									onclick={() => add(slot.volume)}
									disabled={!canAdd}
									aria-label="Add vol. {slot.volume} (missing)"
									class="flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-dashed border-foreground/30 text-muted-foreground transition-colors active:bg-accent disabled:opacity-50"
								>
									{#if pending === slot.volume}
										<LoaderCircle class="h-5 w-5 animate-spin" />
									{:else}
										<span class="font-mono text-lg font-semibold tabular-nums">{slot.volume}</span>
										<span class="flex items-center gap-0.5 text-[10px]">
											<Plus class="h-2.5 w-2.5" />missing
										</span>
									{/if}
								</button>
							{/if}
						</li>
					{/if}
				{/each}
				{#if selecting}
					{#each futureVolumes as v (v)}
						{@const on = selection.includes(v)}
						<li>
							<button
								type="button"
								onclick={() => (selection = toggleVolume(selection, v))}
								aria-pressed={on}
								aria-label="Select vol. {v}"
								class="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border transition-colors {on
									? 'border-primary bg-primary text-primary-foreground'
									: v === owned.next
										? 'border-2 border-primary text-primary'
										: 'border-dashed border-border text-muted-foreground'}"
							>
								<span class="font-mono text-lg font-semibold tabular-nums">{v}</span>
								{#if v === owned.next}<span class="text-[10px] font-semibold">next</span>{/if}
								{#if on}<Check class="absolute top-1 right-1 h-3.5 w-3.5" />{/if}
							</button>
						</li>
					{/each}
					<li>
						<button
							type="button"
							onclick={() => (ahead += 12)}
							class="flex aspect-square w-full flex-col items-center justify-center rounded-xl text-xs font-medium text-muted-foreground active:bg-accent"
						>
							<Plus class="h-4 w-4" /> More
						</button>
					</li>
				{:else}
					<li class="col-span-2">
						<button
							type="button"
							onclick={() => add(owned.next)}
							disabled={!canAdd}
							aria-label="Add vol. {owned.next} (next)"
							class="flex aspect-[2/1] w-full items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary/5 font-semibold text-primary transition-colors active:bg-primary active:text-primary-foreground disabled:opacity-50"
						>
							{#if pending === owned.next}
								<LoaderCircle class="h-5 w-5 animate-spin" />
							{:else}
								<Plus class="h-5 w-5" />
								<span class="font-mono text-lg tabular-nums">Vol. {owned.next}</span>
							{/if}
						</button>
					</li>
				{/if}
			</ol>

			{#if selecting}
				<!-- Room for the action bar, then the bar itself just above the tabs -->
				<div class="h-20" aria-hidden="true"></div>
				<div
					class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-4 py-2 backdrop-blur"
				>
					<button
						type="button"
						onclick={addSelected}
						disabled={!canAdd || selection.length === 0}
						class="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
					>
						{#if pending === BATCH}
							<LoaderCircle class="h-5 w-5 animate-spin" />
						{:else if selection.length === 0}
							Select volumes to add
						{:else}
							Add {selection.length} volume{selection.length > 1 ? 's' : ''} · vol. {volumeRanges(
								selection
							)}
						{/if}
					</button>
				</div>
			{/if}

			{#if !selecting}
				{@const released = selected.totalVolumes}
				<section class="mt-5 rounded-xl border border-border p-3" aria-label="Released volumes">
					<div class="flex items-center gap-3">
						<div class="min-w-0 flex-1">
							<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Released
							</p>
							<p class="text-sm text-foreground">
								{#if released !== null && released >= owned.next}
									Out up to <span class="font-semibold">vol. {released}</span> — vol.
									{volumeSpan(owned.next, released)} to buy
								{:else if released !== null}
									Up to vol. {released} — you have them all
								{:else}
									Seen a newer volume in a shop?
								{/if}
							</p>
						</div>
						<div class="flex h-11 shrink-0 items-center rounded-xl border border-input">
							<button
								type="button"
								onclick={() => stepReleased(-1)}
								disabled={released === null}
								class="flex h-full w-10 items-center justify-center text-muted-foreground active:bg-accent disabled:opacity-30"
								aria-label="Released: one less"
							>
								<Minus class="h-4 w-4" />
							</button>
							<span class="w-9 text-center font-mono text-base font-semibold tabular-nums">
								{released ?? '—'}
							</span>
							<button
								type="button"
								onclick={() => stepReleased(1)}
								class="flex h-full w-10 items-center justify-center text-muted-foreground active:bg-accent"
								aria-label="Released: one more"
							>
								<Plus class="h-4 w-4" />
							</button>
						</div>
					</div>
					{#if released === null}
						<button
							type="button"
							onclick={() => setReleased(owned.next)}
							class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/30 text-sm font-medium text-foreground active:bg-accent"
						>
							<Megaphone class="h-4 w-4" /> Vol. {owned.next} is out
						</button>
					{:else}
						<button
							type="button"
							onclick={() => setReleased(null)}
							class="mt-1 h-9 px-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
						>
							Clear (unknown)
						</button>
					{/if}
				</section>
			{/if}

			{#if owned.extras.length > 0}
				<p class="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Extras
				</p>
				<ul class="flex flex-wrap gap-2">
					{#each owned.extras as slot (slot.volume)}
						<li>
							<button
								type="button"
								title={slotTitle(slot)}
								onclick={() => (readingSlot = slot)}
								class="flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors active:bg-accent"
							>
								{#if slot.status === 'reading'}
									<BookOpen class="h-3 w-3 text-sky-600 dark:text-sky-400" />
								{/if}
								<span class="text-foreground">
									{volumeText({ volumeNumber: slot.volume, isExtra: true }).replace(
										/^extra/,
										'Extra'
									)}
								</span>
								<span class="text-[10px] font-medium text-muted-foreground">
									{locationLetters(slot.locations)}{slot.copies > 1 ? ` ×${slot.copies}` : ''}
								</span>
								{#if slot.read}<Check class="h-3 w-3 text-muted-foreground" />{/if}
								{#if slot.queuedId !== null}
									<ListOrdered class="h-3 w-3 text-sky-600 dark:text-sky-400" />
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<p class="mt-6 text-xs text-muted-foreground">
				A = Apartment · H = Home · <Check class="inline h-3 w-3" /> read ·
				<BookOpen class="inline h-3 w-3" /> reading ·
				<ListOrdered class="inline h-3 w-3" /> queued · tap a volume to log a read or queue it
			</p>
			<a
				href={resolve(`/series/${selected.id}`)}
				class="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
			>
				Open series page
			</a>
			<VolumeReadingSheet
				bind:slot={readingSlot}
				seriesName={selected.shortName}
				books={booksQuery.data ?? []}
			/>
		{/if}
	{/if}
</div>
