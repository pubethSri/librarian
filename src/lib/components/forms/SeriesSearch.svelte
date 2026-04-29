<script lang="ts">
	import { createSeriesListQuery } from '$lib/queries/series';
	import type { SeriesListItem } from '$lib/types';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { ChevronsUpDown, Check } from '@lucide/svelte';

	type Props = {
		value: number | null;
		onselect: (series: SeriesListItem) => void;
	};

	let { value, onselect }: Props = $props();

	const seriesQuery = createSeriesListQuery();

	let open = $state(false);
	let search = $state('');

	const filtered = $derived(() => {
		if (!seriesQuery.data) return [];
		if (!search) return seriesQuery.data;
		const s = search.toLowerCase();
		return seriesQuery.data.filter(
			(item: SeriesListItem) =>
				item.shortName.toLowerCase().includes(s) || item.fullName.toLowerCase().includes(s)
		);
	});

	const selectedLabel = $derived(() => {
		if (!value || !seriesQuery.data) return 'Select series...';
		const found = seriesQuery.data.find((s: SeriesListItem) => s.id === value);
		return found ? found.shortName : 'Select series...';
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<Button variant="outline" class="w-full justify-between font-normal">
			{selectedLabel()}
			<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[--bits-popover-anchor-width] p-0" align="start">
		<Command.Root shouldFilter={false}>
			<Command.Input bind:value={search} placeholder="Search series..." />
			<Command.List>
				<Command.Empty>No series found.</Command.Empty>
				<Command.Group>
					{#each filtered() as series}
						<Command.Item
							value={String(series.id)}
							onSelect={() => {
								onselect(series);
								open = false;
							}}
						>
							<Check
								class="mr-2 h-4 w-4 {value === series.id ? 'opacity-100' : 'opacity-0'}"
							/>
							<div class="flex flex-col">
								<span class="text-sm font-medium">{series.shortName}</span>
								<span class="text-xs text-muted-foreground">{series.fullName}</span>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
