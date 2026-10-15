<script lang="ts">
	import { chart } from '$lib/actions/chart';
	import type { ChartConfiguration } from 'chart.js';

	type Props = {
		title: string;
		description?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		config: ChartConfiguration<any>;
		/** Plot height in px */
		height?: number;
		/** Shown instead of the chart when set (not enough data) */
		empty?: string | null;
		/** Formats values in the data table */
		format?: (value: number) => string;
		/** A footnote under the chart */
		note?: string | null;
	};

	let {
		title,
		description,
		config,
		height = 240,
		empty = null,
		format = (v) => v.toLocaleString('en-US'),
		note = null
	}: Props = $props();

	// The same numbers as a table — the chart's accessible twin
	const table = $derived({
		labels: (config.data.labels ?? []) as string[],
		datasets: config.data.datasets.map((d) => ({
			label: String(d.label ?? ''),
			data: d.data as number[]
		}))
	});
</script>

<figure class="min-w-0 space-y-3">
	<figcaption>
		<p class="text-sm font-medium text-foreground">{title}</p>
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
	</figcaption>

	{#if empty}
		<div
			class="flex items-center justify-center rounded-md border border-dashed border-border px-6 text-center text-sm text-muted-foreground"
			style="height: {height}px"
		>
			{empty}
		</div>
	{:else}
		<div class="relative" style="height: {height}px" role="img" aria-label={title}>
			<canvas use:chart={config}></canvas>
		</div>
		<details class="text-xs text-muted-foreground">
			<summary class="cursor-pointer select-none hover:text-foreground">Show data</summary>
			<div class="mt-2 max-h-64 overflow-auto">
				<table class="w-full text-left tabular-nums">
					<thead>
						<tr class="border-b border-border">
							<th class="py-1 pr-4 font-medium"></th>
							{#each table.datasets as d (d.label)}
								<th class="py-1 pr-4 text-right font-medium">{d.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each table.labels as label, i (label)}
							<tr class="border-b border-border/50">
								<td class="py-1 pr-4 text-foreground">{label}</td>
								{#each table.datasets as d (d.label)}
									<td class="py-1 pr-4 text-right">{format(d.data[i] ?? 0)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	{/if}
	{#if note}
		<p class="text-xs text-muted-foreground">{note}</p>
	{/if}
</figure>
