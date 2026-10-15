<script lang="ts">
	import { createInsightsQuery } from '$lib/queries/insights';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import StatTile from '$lib/components/insights/StatTile.svelte';
	import ChartCard from '$lib/components/insights/ChartCard.svelte';
	import { barChart, READ_STATE_COLORS } from '$lib/components/insights/charts';
	import { coverageText, moneyText, percent, plural } from '$lib/insights/format';
	import { READING_STATUS_LABELS, SERIES_TYPE_LABELS, type ReadState } from '$lib/types';

	const insightsQuery = createInsightsQuery();
	const data = $derived(insightsQuery.data);

	// "Hide ฿": money shows by default; the switch hides every baht figure for this visit
	let hideMoney = $state(false);

	// Stacking order: the finished part first, the pile last
	const STACK: readonly ReadState[] = ['read', 'reading', 'dropped', 'unread'];

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
	{/if}
</div>
