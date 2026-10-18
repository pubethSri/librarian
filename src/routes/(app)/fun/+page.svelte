<script lang="ts">
	// Fun: playful numbers about the collection, in one place (decided 2026-10-18).
	// The unread pile's height (→ the Instagram pile stories, also reachable from
	// the phone's Queue tab and each bookfair page) and "How long to clear the
	// pile?" — My pace / By the fair. Desktop first; logic in $lib/stories/pile
	// and $lib/fun/pace.
	import { Layers, PartyPopper } from '@lucide/svelte';
	import PileStories from '$lib/components/stories/PileStories.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { createBooksListQuery } from '$lib/queries/books';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { formatDay } from '$lib/console/logic';
	import { todayLocal } from '$lib/field/logic';
	import { compareHeight, formatHeight, pileOf, storyFair } from '$lib/stories/pile';
	import {
		MAX_NOVELS_PER_DAY,
		addDays,
		approxLabel,
		buyPerDay,
		clearTime,
		dayDiff,
		daysLabel,
		daysPerVolume,
		fairRelation,
		fairsLine,
		fairsPassed,
		holidaysLine,
		neededPace,
		nextSpringFair,
		novelPaceText,
		olderLine,
		short,
		slowJoke,
		type Pace,
		type PaceUnit
	} from '$lib/fun/pace';
	import type { SeriesType } from '$lib/types';

	const booksQuery = createBooksListQuery();
	const seriesQuery = createSeriesListQuery();
	const fairsQuery = createBookfairsListQuery();

	const today = todayLocal();
	const books = $derived(booksQuery.data ?? []);
	const fairs = $derived(fairsQuery.data ?? []);
	const ready = $derived(!!booksQuery.data && !!seriesQuery.data);
	const typeOf = $derived(
		new Map<number, SeriesType>((seriesQuery.data ?? []).map((s) => [s.id, s.type]))
	);
	const pile = $derived(pileOf(books, typeOf));

	// ─── Pile stories ────────────────────────────────────────────────────────
	let storiesOpen = $state(false);
	const fairsWithBooks = $derived(
		[...fairs].filter((f) => f.bookCount > 0).sort((a, b) => b.date.localeCompare(a.date))
	);
	let storyFairId = $state<number | null>(null);
	const chosenFair = $derived(
		fairsWithBooks.find((f) => f.id === storyFairId) ?? storyFair(fairs, null)
	);
	// bits-ui Select values are strings
	const storyFairValue = {
		get value() {
			return chosenFair ? String(chosenFair.id) : '';
		},
		set value(v: string) {
			storyFairId = v ? Number(v) : null;
		}
	};

	// ─── Pace (remembered on this device) ────────────────────────────────────
	const PACE_KEY = 'librarian.fun.pace';
	type Paces = { light_novel: Pace; manga: Pace };
	const DEFAULT_PACES: Paces = {
		light_novel: { value: 2, unit: 'daysPer' },
		manga: { value: 3, unit: 'perDay' }
	};

	function loadPaces(): Paces {
		try {
			const raw = localStorage.getItem(PACE_KEY);
			if (raw) return { ...DEFAULT_PACES, ...(JSON.parse(raw) as Partial<Paces>) };
		} catch {
			// Storage unavailable or broken: the defaults
		}
		return structuredClone(DEFAULT_PACES);
	}

	let paces = $state<Paces>(loadPaces());
	$effect(() => {
		const json = JSON.stringify(paces);
		try {
			localStorage.setItem(PACE_KEY, json);
		} catch {
			// The pace lasts for this visit only
		}
	});

	let keepBuying = $state(false);
	let tab = $state('mine');

	const dpv = $derived({
		light_novel: daysPerVolume(paces.light_novel),
		manga: daysPerVolume(paces.manga)
	});
	const buying = $derived(buyPerDay(books, typeOf, today));
	const buyingPerMonth = $derived(
		Math.round((buying.light_novel + buying.manga) * 30.44 * 10) / 10
	);

	const clear = $derived(
		dpv.light_novel !== null && dpv.manga !== null
			? clearTime(
					pile.byType,
					{ light_novel: dpv.light_novel, manga: dpv.manga },
					keepBuying ? buying : null
				)
			: null
	);

	// ─── By the fair ─────────────────────────────────────────────────────────
	const spring = $derived(nextSpringFair(fairs, today));
	let fairDateEdit = $state('');
	const fairDate = $derived(fairDateEdit || spring?.date || '');
	const needed = $derived(
		fairDate && dpv.manga !== null
			? neededPace(pile.byType, today, fairDate, dpv.manga, keepBuying ? buying : null)
			: null
	);

	const TYPES: { type: SeriesType; label: string }[] = [
		{ type: 'light_novel', label: 'Light novels' },
		{ type: 'manga', label: 'Manga' }
	];

	function setUnit(type: SeriesType, unit: PaceUnit) {
		paces[type].unit = unit;
	}

	function paceText(type: SeriesType): string {
		const d = dpv[type];
		if (d === null) return '';
		const noun = type === 'manga' ? 'manga' : 'novel';
		return d < 1
			? `${short(1 / d)} ${noun}${type === 'manga' || short(1 / d) === '1' ? '' : 's'} a day`
			: `1 ${noun} every ${short(d)} day${short(d) === '1' ? '' : 's'}`;
	}
</script>

<svelte:head>
	<title>Fun — Librarian</title>
</svelte:head>

<div class="max-w-4xl space-y-10">
	<div>
		<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
			<PartyPopper class="h-6 w-6" /> Fun
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Playful numbers about the pile. Not to be taken seriously.
		</p>
	</div>

	{#if !ready}
		<Skeleton class="h-40" />
		<Skeleton class="h-72" />
	{:else}
		<!-- Unread pile height -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold text-foreground">Unread pile</h2>
			<div class="flex flex-wrap items-center gap-6 rounded-xl border border-border p-5">
				<div class="flex h-24 w-10 shrink-0 flex-col-reverse gap-px" aria-hidden="true">
					{#each pile.spines.slice(-24) as s, i (s.bookId)}
						<span
							class="block h-[3px] {i % 4 === 0
								? 'bg-zinc-800'
								: i % 4 === 1
									? 'bg-zinc-400'
									: i % 4 === 2
										? 'bg-zinc-600'
										: 'bg-zinc-300'}"
						></span>
					{/each}
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-4xl font-bold text-foreground tabular-nums">{formatHeight(pile.cm)}</p>
					<p class="mt-1 text-sm text-foreground">
						{pile.books} unread · {pile.byType.light_novel} light novels, {pile.byType.manga}
						manga
					</p>
					<p class="text-sm text-muted-foreground">
						{compareHeight(pile.cm).replace(/^./, (c) => c.toUpperCase())} · 1.8 cm a novel, 1.2 cm a
						manga
					</p>
				</div>
				<div class="flex flex-col items-end gap-2">
					{#if fairsWithBooks.length > 0}
						<Select.Root type="single" bind:value={storyFairValue.value}>
							<Select.Trigger class="w-64" aria-label="Fair for the second story">
								<span class="truncate">{chosenFair ? chosenFair.name : 'No fair story'}</span>
							</Select.Trigger>
							<Select.Content>
								{#each fairsWithBooks as f (f.id)}
									<Select.Item value={String(f.id)}>{f.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
					<Button class="gap-1.5" onclick={() => (storiesOpen = true)}>
						<Layers class="h-4 w-4" /> Pile stories
					</Button>
				</div>
			</div>
		</section>

		<!-- How long to clear the pile -->
		<section class="space-y-3">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="text-lg font-semibold text-foreground">How long to clear the pile?</h2>
				<div class="flex items-center gap-2">
					<Switch id="keep-buying" bind:checked={keepBuying} />
					<Label for="keep-buying" class="text-sm text-muted-foreground">
						Keep buying like usual ({buyingPerMonth} books a month)
					</Label>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each TYPES as t (t.type)}
					<div class="space-y-2 rounded-xl border border-border p-4">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							{t.label} · {pile.byType[t.type]} unread
						</p>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0.1"
								step="0.5"
								class="w-20 tabular-nums"
								aria-label="{t.label} pace"
								bind:value={paces[t.type].value}
							/>
							<div class="flex overflow-hidden rounded-lg border border-border text-sm">
								<button
									type="button"
									class="px-3 py-1.5 {paces[t.type].unit === 'perDay'
										? 'bg-foreground text-background'
										: 'bg-background text-muted-foreground hover:text-foreground'}"
									aria-pressed={paces[t.type].unit === 'perDay'}
									onclick={() => setUnit(t.type, 'perDay')}>volumes a day</button
								>
								<button
									type="button"
									class="px-3 py-1.5 {paces[t.type].unit === 'daysPer'
										? 'bg-foreground text-background'
										: 'bg-background text-muted-foreground hover:text-foreground'}"
									aria-pressed={paces[t.type].unit === 'daysPer'}
									onclick={() => setUnit(t.type, 'daysPer')}>days a volume</button
								>
							</div>
						</div>
						<p class="text-sm text-muted-foreground">
							{#if dpv[t.type] === null}
								<span class="text-destructive">Enter a pace above 0</span>
							{:else}
								{paceText(t.type)}
							{/if}
						</p>
					</div>
				{/each}
			</div>

			<Tabs.Root bind:value={tab} class="space-y-3">
				<Tabs.List>
					<Tabs.Trigger value="mine">My pace</Tabs.Trigger>
					<Tabs.Trigger value="fair">By the fair</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="mine">
					<div class="rounded-xl bg-zinc-950 p-6 text-zinc-50">
						<p class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">At this pace</p>
						{#if clear === null}
							<p class="mt-2 text-zinc-300">Enter a pace for both to see it.</p>
						{:else if clear.kind === 'empty'}
							<p class="mt-1 text-4xl font-bold">Already done</p>
							<p class="mt-2 text-zinc-300">Nothing unread. Time to go buy books?</p>
						{:else if clear.kind === 'never'}
							<p class="mt-1 text-4xl font-bold">Never</p>
							<p class="mt-2 text-zinc-300">
								You buy faster than you read: every day brings {short(clear.load)} days of new reading.
								The pile wins.
							</p>
						{:else}
							{@const end = addDays(today, clear.days)}
							{@const approx = approxLabel(clear.days)}
							{@const older = olderLine(clear.days)}
							{@const joke = slowJoke(clear.days)}
							<p class="mt-1 text-4xl font-bold tabular-nums">{daysLabel(clear.days)}</p>
							<p class="mt-1 text-zinc-300">
								{approx ? `${approx} · ` : ''}done {formatDay(end)}
							</p>
							<ul class="mt-4 space-y-1.5 text-sm">
								<li class="text-highlight-soft">◆ {holidaysLine(today, end)}</li>
								<li class="text-zinc-200">{fairsLine(fairsPassed(fairs, today, end))}</li>
								{#if spring}
									<li class="text-zinc-400">{fairRelation(end, fairDate || spring.date)}</li>
								{/if}
								{#if older}
									<li class="text-zinc-200">{older}</li>
								{/if}
								{#if joke}
									<li class="text-highlight-soft">{joke}</li>
								{/if}
							</ul>
						{/if}
					</div>
				</Tabs.Content>

				<Tabs.Content value="fair">
					<div class="space-y-3">
						{#if !spring}
							<p class="text-sm text-muted-foreground">
								No spring fair on record to guess from — pick a date.
							</p>
						{/if}
						<div class="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
							<div class="min-w-0 flex-1">
								<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Next spring fair
								</p>
								<p class="mt-1 font-medium text-foreground">
									{spring?.name ?? 'Spring fair'}
								</p>
								<p class="text-xs text-muted-foreground">
									{#if fairDateEdit}
										Your date
									{:else if spring?.guessed}
										Guessed from last year's — change it if you know better
									{:else if spring}
										On record
									{/if}
									{#if fairDate}
										· {daysLabel(Math.max(0, dayDiff(today, fairDate)))} from today{/if}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<Input
									type="date"
									class="w-44"
									aria-label="Spring fair date"
									value={fairDate}
									onchange={(e) => (fairDateEdit = e.currentTarget.value)}
								/>
								{#if fairDateEdit}
									<Button variant="ghost" size="sm" onclick={() => (fairDateEdit = '')}>
										Reset
									</Button>
								{/if}
							</div>
						</div>

						<div class="rounded-xl bg-zinc-950 p-6 text-zinc-50">
							<p class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
								To clear it by then, read
							</p>
							{#if needed === null}
								<p class="mt-2 text-zinc-300">Pick a date and a manga pace to see it.</p>
							{:else if needed.kind === 'past'}
								<p class="mt-2 text-zinc-300">That date has passed — pick a later one.</p>
							{:else if needed.kind === 'empty'}
								<p class="mt-1 text-3xl font-bold">Nothing</p>
								<p class="mt-2 text-zinc-300">The pile is already gone.</p>
							{:else if needed.kind === 'mangaOnly'}
								<p class="mt-1 text-3xl font-bold">Just your {needed.manga} manga</p>
								<p class="mt-2 text-zinc-300">
									About {short(needed.mangaDays)} days at your manga pace{needed.fits
										? '.'
										: ' — longer than you have.'}
								</p>
							{:else}
								<p class="mt-1 text-3xl font-bold">
									{needed.perDay === Infinity ? 'Impossible' : novelPaceText(needed.perDay)}
								</p>
								{#if needed.perDay !== Infinity}
									<p class="mt-1 text-zinc-300">
										≈ {short(needed.perDay * 7)} novels a week, every week · {needed.novels} novels
									</p>
								{/if}
								<ul class="mt-4 space-y-1.5 text-sm">
									{#if needed.manga > 0}
										<li class="text-zinc-200">
											+ your {needed.manga} manga: about {short(needed.mangaDays)} days at {paceText(
												'manga'
											)}
										</li>
									{/if}
									{#if needed.perDay === Infinity}
										<li class="text-highlight-soft">
											◆ The manga alone take until the fair. Read faster, or move the fair.
										</li>
									{:else if needed.impossible}
										<li class="text-highlight-soft">
											◆ Not humanly possible — even your best day was {MAX_NOVELS_PER_DAY} novels.
										</li>
									{:else}
										<li class="text-highlight-soft">◆ Doable. Probably.</li>
									{/if}
									{#if keepBuying}
										<li class="text-zinc-400">Includes what you'd buy until then.</li>
									{/if}
								</ul>
							{/if}
						</div>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</section>
	{/if}
</div>

<PileStories
	bind:open={storiesOpen}
	{books}
	series={seriesQuery.data ?? []}
	fair={chosenFair ? { id: chosenFair.id, name: chosenFair.name } : null}
	{today}
/>
