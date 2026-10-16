<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { createBooksListQuery } from '$lib/queries/books';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import TypeBadge from '$lib/components/TypeBadge.svelte';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, Check, LoaderCircle, Plus, Search, Star, X } from '@lucide/svelte';
	import {
		groupBySeries,
		lastPrice,
		ownedVolumes,
		parsePrice,
		purchaseFields,
		searchSeries,
		type OwnedVolumes,
		type VolumeSlot
	} from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import { getFieldSettings } from '$lib/field/settings.svelte';
	import {
		AlreadyAddedError,
		createQuickAddMutation,
		createUndoAddMutation
	} from '$lib/queries/field';
	import { BOOK_LOCATION_LABELS, SERIES_STATUS_LABELS, type BookLocation } from '$lib/types';

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

	// ─── Quick add ──────────────────────────────────────────────────────────
	const LOCATIONS = ['apartment', 'home'] as const;
	const settings = getFieldSettings();
	const quickAdd = createQuickAddMutation();
	const undoAdd = createUndoAddMutation();

	let priceText = $state('');
	let pricedFor = $state<number | null>(null);
	/** The volume being saved; one add at a time */
	let pending = $state<number | null>(null);

	const price = $derived(parsePrice(priceText));
	const canAdd = $derived(settings.ready && pending === null && price !== null);

	// Pre-fill the price once per opened series — a typed price survives refetches
	$effect(() => {
		if (!selected || loading || pricedFor === selected.id) return;
		pricedFor = selected.id;
		const p = lastPrice(booksBySeries.get(selected.id) ?? []);
		priceText = p === null ? '' : String(p);
	});

	async function add(volume: number) {
		if (!selected || !canAdd || price === null) return;
		const series = selected;
		pending = volume;
		try {
			const book = await quickAdd.mutateAsync({
				seriesId: series.id,
				volumeNumber: volume,
				isExtra: false,
				location: settings.location,
				price,
				...purchaseFields(settings.fairId, settings.today),
				isDraft: false
			});
			toast.success(`Added Vol. ${volume}`, {
				description: series.shortName,
				duration: 6000,
				action: { label: 'Undo', onClick: () => undo(book.id, volume) }
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

	async function undo(bookId: number, volume: number) {
		try {
			await undoAdd.mutateAsync(bookId);
			toast(`Removed Vol. ${volume}`);
		} catch {
			toast.error(`Couldn't undo Vol. ${volume} — remove it on the desktop`);
		}
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
		return `${name}: ${where}${slot.read ? ' · read' : ''}`;
	}
</script>

<svelte:head>
	<title>Field Mode — Librarian</title>
</svelte:head>

<div class="mx-auto max-w-md">
	{#if selectedId === null}
		<!-- ─── Search ─────────────────────────────────────────────────────── -->
		<div class="sticky top-12 z-20 -mx-4 bg-background/95 px-4 pt-1 pb-3 backdrop-blur">
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
				<div
					role="radiogroup"
					aria-label="Location"
					class="flex h-12 shrink-0 gap-1 rounded-xl border border-input p-1"
				>
					{#each LOCATIONS as loc (loc)}
						<button
							type="button"
							role="radio"
							aria-checked={settings.location === loc}
							onclick={() => (settings.location = loc)}
							class="rounded-lg px-3 text-sm font-medium transition-colors {settings.location ===
							loc
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground active:bg-accent'}"
						>
							{BOOK_LOCATION_LABELS[loc]}
						</button>
					{/each}
				</div>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				{#if price === null}
					<span class="text-destructive">Price: digits only, e.g. 175 or 89.50</span>
				{:else}
					Tap <span class="font-semibold text-foreground">+</span> to add — saved at once, dated today.
				{/if}
			</p>

			<ol class="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
				{#each owned.volumes as slot (slot.volume)}
					{#if slot.copies > 0}
						<!-- Owned tiles stay inert: reserved for the v0.4 reading actions -->
						<li
							title={slotTitle(slot)}
							class="relative flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-card"
						>
							<span class="font-mono text-lg font-semibold tabular-nums">{slot.volume}</span>
							<span class="text-[10px] font-medium text-muted-foreground">
								{locationLetters(slot.locations)}{slot.copies > 1 ? ` ×${slot.copies}` : ''}
							</span>
							{#if slot.read}
								<Check class="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
							{/if}
						</li>
					{:else}
						<li>
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
						</li>
					{/if}
				{/each}
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
			</ol>

			{#if owned.extras.length > 0}
				<p class="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Extras
				</p>
				<ul class="flex flex-wrap gap-2">
					{#each owned.extras as slot (slot.volume)}
						<li
							title={slotTitle(slot)}
							class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm"
						>
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
						</li>
					{/each}
				</ul>
			{/if}

			<p class="mt-6 text-xs text-muted-foreground">
				A = Apartment · H = Home · <Check class="inline h-3 w-3" /> read
			</p>
			<a
				href={resolve(`/series/${selected.id}`)}
				class="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
			>
				Open series page
			</a>
		{/if}
	{/if}
</div>
