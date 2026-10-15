<script lang="ts">
	import { resolve } from '$app/paths';
	import { createInsightsQuery } from '$lib/queries/insights';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import StatTile from '$lib/components/insights/StatTile.svelte';
	import ChartCard from '$lib/components/insights/ChartCard.svelte';
	import InsightSection from '$lib/components/insights/InsightSection.svelte';
	import ExtraBadge from '$lib/components/ExtraBadge.svelte';
	import {
		barChart,
		lineChart,
		NEUTRAL,
		READ_STATE_COLORS,
		TYPE_COLORS
	} from '$lib/components/insights/charts';
	import {
		coverageText,
		durationText,
		monthLabel,
		moneyText,
		percent,
		plural,
		rateText
	} from '$lib/insights/format';
	import { formatDay } from '$lib/console/logic';
	import { MIN_DATED_READS } from '$lib/insights/backlog';
	import {
		READING_STATUS_LABELS,
		SERIES_TYPE_LABELS,
		type InsightsBacklog,
		type ReadState
	} from '$lib/types';

	const insightsQuery = createInsightsQuery();
	const data = $derived(insightsQuery.data);

	// "Hide ฿": money shows by default; the switch hides every baht figure for this visit
	let hideMoney = $state(false);

	const sections = [
		{ id: 'backlog', label: 'Backlog' },
		{ id: 'growth', label: 'Growth' }
	];

	// Stacking order: the finished part first, the pile last
	const STACK: readonly ReadState[] = ['read', 'reading', 'dropped', 'unread'];

	const NO_DATED_READS = `Needs ${MIN_DATED_READS}+ dated reads over a month — reads you mark from now on are dated.`;

	const typeChart = $derived(
		data
			? barChart({
					labels: data.overview.byType.map((t) => SERIES_TYPE_LABELS[t.type]),
					series: STACK.map((state) => ({
						label: READING_STATUS_LABELS[state],
						data: data.overview.byType.map((t) => t.counts[state]),
						color: READ_STATE_COLORS[state]
					})),
					stacked: true,
					horizontal: true
				})
			: null
	);

	const boughtReadChart = $derived(
		data
			? barChart({
					labels: data.backlog.monthly.map((m) => monthLabel(m.month, true)),
					series: [
						{ label: 'Bought', data: data.backlog.monthly.map((m) => m.bought), color: NEUTRAL },
						{
							label: 'Read (dated)',
							data: data.backlog.monthly.map((m) => m.read),
							color: READ_STATE_COLORS.read
						}
					]
				})
			: null
	);

	const growthLabels = $derived(
		data ? data.growth.monthly.map((m) => monthLabel(m.month, true)) : []
	);

	const growthChart = $derived(
		data
			? barChart({
					labels: growthLabels,
					series: (['light_novel', 'manga'] as const).map((type) => ({
						label: SERIES_TYPE_LABELS[type],
						data: data.growth.monthly.map((m) => m[type]),
						color: TYPE_COLORS[type]
					})),
					stacked: true
				})
			: null
	);

	const cumulativeChart = $derived(
		data
			? lineChart({
					labels: growthLabels,
					series: [{ label: 'Books owned', data: data.growth.cumulative, color: NEUTRAL }]
				})
			: null
	);

	function clearText(b: InsightsBacklog): { value: string; sub: string } {
		switch (b.clear.kind) {
			case 'unknown':
				return { value: '—', sub: 'needs a read rate' };
			case 'never':
				return { value: 'Never', sub: 'at this pace — buying ≥ reading' };
			case 'months':
				return {
					value: durationText(b.clear.months),
					sub:
						b.clearWithoutBuying !== null
							? `${durationText(b.clearWithoutBuying)} if you stopped buying`
							: ''
				};
		}
	}
</script>

<svelte:head>
	<title>Insights — Librarian</title>
</svelte:head>

<div class="space-y-10">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				What the collection says about buying and reading.
			</p>
			<nav class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
				{#each sections as s (s.id)}
					<a href="#{s.id}" class="text-muted-foreground hover:text-foreground">{s.label}</a>
				{/each}
			</nav>
		</div>
		<div class="flex items-center gap-2">
			<Switch id="hide-money" bind:checked={hideMoney} />
			<Label for="hide-money" class="text-sm text-muted-foreground">Hide ฿</Label>
		</div>
	</div>

	{#if insightsQuery.isPending}
		<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
			{#each Array(6) as _, i (i)}
				<Skeleton class="h-16" />
			{/each}
		</div>
		<Skeleton class="h-48" />
	{:else if insightsQuery.isError || !data}
		<p class="text-sm text-destructive">Couldn't load insights: {insightsQuery.error?.message}</p>
	{:else}
		{@const o = data.overview}
		{@const b = data.backlog}
		<section class="space-y-8">
			<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
				<StatTile
					label="Books"
					value={o.books.toLocaleString('en-US')}
					sub={o.extras > 0 ? `incl. ${plural(o.extras, 'extra')}` : null}
				/>
				<StatTile label="Series" value={o.series.toLocaleString('en-US')} />
				<StatTile
					label="Read"
					value={o.readState.read.toLocaleString('en-US')}
					sub={percent(o.readState.read, o.books)}
				/>
				<StatTile label="Reading" value={o.readState.reading.toLocaleString('en-US')} />
				<StatTile
					label="Unread pile"
					value={o.readState.unread.toLocaleString('en-US')}
					sub={percent(o.readState.unread, o.books)}
				/>
				<StatTile
					label="Spent"
					value={moneyText(o.spent, hideMoney)}
					sub={hideMoney ? null : coverageText(o.spent)}
				/>
			</div>

			{#if typeChart}
				<ChartCard
					title="Books by type and reading state"
					description="Read counts a book read at least once, even while it's being re-read."
					config={typeChart}
					height={140}
					note={o.readState.dropped > 0 ? `${plural(o.readState.dropped, 'book')} dropped.` : null}
				/>
			{/if}
		</section>

		<InsightSection
			id="backlog"
			title="Backlog"
			description="The tsundoku pile: books bought and not yet read, and whether reading keeps up with buying."
		>
			{@const clear = clearText(b)}
			<div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
				<StatTile
					label="Unread pile"
					value={b.pile.toLocaleString('en-US')}
					sub={`${SERIES_TYPE_LABELS.light_novel} ${b.pileByType.light_novel} · ${SERIES_TYPE_LABELS.manga} ${b.pileByType.manga}`}
				/>
				<StatTile label="Buying" value={rateText(b.buyRate)} sub="last 12 months" />
				<StatTile
					label="Reading"
					value={b.readRate === null ? '—' : rateText(b.readRate)}
					sub={b.readRate === null
						? `${plural(b.datedReads, 'dated read')} so far`
						: 'dated reads, last 12 months'}
				/>
				<StatTile label="Time to clear" value={clear.value} sub={clear.sub} />
			</div>

			{#if boughtReadChart}
				<ChartCard
					title="Bought vs read, last 12 months"
					description="Books by purchase month; reads by finish month (dated reads only)."
					config={boughtReadChart}
					note={b.readRate === null ? NO_DATED_READS : null}
				/>
			{/if}

			<div class="grid gap-8 lg:grid-cols-2">
				<div class="space-y-3">
					<p class="text-sm font-medium text-foreground">Waiting longest</p>
					{#if b.oldestUnread.length === 0}
						<p class="text-sm text-muted-foreground">No dated unread books.</p>
					{:else}
						<ol class="divide-y divide-border">
							{#each b.oldestUnread as book (book.bookId)}
								<li class="flex items-baseline justify-between gap-4 py-2 text-sm">
									<a
										href={resolve(`/series/${book.seriesId}`)}
										class="min-w-0 truncate text-foreground hover:underline"
									>
										{book.seriesShortName}
										{#if book.isExtra}
											<ExtraBadge
												book={{ volumeNumber: book.volumeNumber, isExtra: true }}
												class="ml-1"
											/>
										{:else}
											<span class="ml-1 font-mono text-muted-foreground">
												Vol. {book.volumeNumber}
											</span>
										{/if}
									</a>
									<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
										{formatDay(book.boughtDay)}
									</span>
								</li>
							{/each}
						</ol>
					{/if}
					{#if b.undatedPile > 0}
						<p class="text-xs text-muted-foreground">
							{plural(b.undatedPile, 'unread book')} without a purchase date not ranked.
						</p>
					{/if}
				</div>

				<div class="space-y-3">
					<p class="text-sm font-medium text-foreground">
						Owned but never started
						<span class="font-normal text-muted-foreground">· {b.neverStarted.length} series</span>
					</p>
					{#if b.neverStarted.length === 0}
						<p class="text-sm text-muted-foreground">Every series has been started.</p>
					{:else}
						<ol class="max-h-72 divide-y divide-border overflow-y-auto pr-2">
							{#each b.neverStarted as s (s.seriesId)}
								<li class="flex items-baseline justify-between gap-4 py-2 text-sm">
									<a
										href={resolve(`/series/${s.seriesId}`)}
										class="min-w-0 truncate text-foreground hover:underline"
									>
										{s.shortName}
										{#if s.status === 'dropped'}
											<Badge variant="outline" class="ml-1 text-[10px]">Dropped</Badge>
										{/if}
									</a>
									<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
										{SERIES_TYPE_LABELS[s.type]} · {plural(s.owned, 'book')}
									</span>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			</div>
		</InsightSection>

		<InsightSection
			id="growth"
			title="Collection growth"
			description="Books by purchase month, from the first dated purchase."
		>
			{@const g = data.growth}
			{#if growthChart && cumulativeChart && g.monthly.length > 0}
				{@const busiest = g.monthly.reduce((max, m) => (m.total > max.total ? m : max))}
				<div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
					<StatTile
						label="Since"
						value={monthLabel(g.monthly[0].month)}
						sub={plural(g.monthly.length, 'month')}
					/>
					<StatTile
						label="Busiest month"
						value={monthLabel(busiest.month)}
						sub={plural(busiest.total, 'book')}
					/>
				</div>
				<ChartCard
					title="Books bought per month"
					config={growthChart}
					height={260}
					note={g.undated > 0
						? `${plural(g.undated, 'book')} without a purchase date not shown.`
						: null}
				/>
				<ChartCard
					title="Books owned over time"
					description="Running total of dated purchases."
					config={cumulativeChart}
					height={200}
				/>
			{:else}
				<p class="text-sm text-muted-foreground">No dated purchases yet.</p>
			{/if}
		</InsightSection>
	{/if}
</div>
