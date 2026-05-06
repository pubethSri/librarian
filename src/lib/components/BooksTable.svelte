<script lang="ts">
	import type { BookListItem } from '$lib/types';
	import { BOOK_LOCATION_LABELS, BOOK_SOURCE_LABELS } from '$lib/types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AdvancedFilter from '$lib/components/AdvancedFilter.svelte';
	import { applyCondition, type FilterColumnDef, type FilterCondition } from '$lib/components/advancedFilterUtils';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowUp, ArrowDown, ChevronsUpDown, Trash2, Pencil } from '@lucide/svelte';

	type Props = {
		data: BookListItem[];
		onDelete?: (id: number) => void;
		onEdit?: (book: BookListItem) => void;
	};

	let { data, onDelete, onEdit }: Props = $props();

	// Filter state
	let search = $state('');
	let locationFilter = $state<string>('all');
	let sourceFilter = $state<string>('all');
	let draftFilter = $state<string>('all');

	// Advanced filter state
	let advancedConditions = $state<FilterCondition[]>([]);

	const advancedFilterColumns: FilterColumnDef[] = [
		{ key: 'seriesShortName', label: 'Series', type: 'text' },
		{ key: 'volumeNumber', label: 'Volume', type: 'number' },
		{
			key: 'location',
			label: 'Location',
			type: 'select',
			options: [
				{ value: 'home', label: 'Home' },
				{ value: 'apartment', label: 'Apartment' }
			]
		},
		{
			key: 'source',
			label: 'Source',
			type: 'select',
			options: [
				{ value: 'bookstore', label: 'Bookstore' },
				{ value: 'bookfair', label: 'Bookfair' },
				{ value: 'online', label: 'Online' }
			]
		},
		{ key: 'boughtAt', label: 'Purchase Date', type: 'text' },
		{ key: 'price', label: 'Price', type: 'number' },
		{ key: 'isDraft', label: 'Draft', type: 'boolean' }
	];

	// Sort state
	let sortKey = $state<string>('seriesShortName');
	let sortDir = $state<'asc' | 'desc'>('asc');

	// Pagination state
	let pageSize = $state(25);
	let pageIndex = $state(0);

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	const filtered = $derived(() => {
		let result = data;

		if (search) {
			const s = search.toLowerCase();
			result = result.filter(
				(r) => r.seriesShortName.toLowerCase().includes(s) || r.seriesFullName.toLowerCase().includes(s)
			);
		}

		if (locationFilter !== 'all') {
			result = result.filter((r) => r.location === locationFilter);
		}
		if (sourceFilter !== 'all') {
			result = result.filter((r) => r.source === sourceFilter);
		}
		if (draftFilter === 'drafts') {
			result = result.filter((r) => r.isDraft);
		}

		// Advanced filters
		if (advancedConditions.length > 0) {
			result = result.filter((row) =>
				advancedConditions.every((cond) =>
					applyCondition(row as unknown as Record<string, unknown>, cond, advancedFilterColumns)
				)
			);
		}

		return result;
	});

	const sorted = $derived(() => {
		const items = [...filtered()];
		items.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'seriesShortName':
					cmp = a.seriesShortName.localeCompare(b.seriesShortName);
					break;
				case 'volumeNumber':
					cmp = Number(a.volumeNumber) - Number(b.volumeNumber);
					break;
				case 'location':
					cmp = a.location.localeCompare(b.location);
					break;
				case 'source':
					cmp = (a.source || '').localeCompare(b.source || '');
					break;
				case 'boughtAt': {
					const da = a.boughtAt ? new Date(a.boughtAt).getTime() : 0;
					const db = b.boughtAt ? new Date(b.boughtAt).getTime() : 0;
					cmp = da - db;
					break;
				}
				default:
					cmp = 0;
			}
			return sortDir === 'desc' ? -cmp : cmp;
		});
		return items;
	});

	const paginated = $derived(() => {
		const s = sorted();
		const start = pageIndex * pageSize;
		return s.slice(start, start + pageSize);
	});

	const pageCount = $derived(() => Math.max(1, Math.ceil(sorted().length / pageSize)));

	$effect(() => {
		search; locationFilter; sourceFilter; draftFilter; advancedConditions;
		pageIndex = 0;
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	type Column = { key: string; label: string; sortable: boolean };
	const columns: Column[] = [
		{ key: 'seriesShortName', label: 'Series', sortable: true },
		{ key: 'volumeNumber', label: 'Vol.', sortable: true },
		{ key: 'location', label: 'Location', sortable: true },
		{ key: 'source', label: 'Source', sortable: true },
		{ key: 'boughtAt', label: 'Purchased', sortable: true },
		{ key: 'isDraft', label: 'Draft', sortable: false }
	];
</script>

<!-- Toolbar -->
<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
	<Input
		placeholder="Search by series name..."
		class="h-9 w-full sm:max-w-xs"
		value={search}
		oninput={(e: Event) => (search = (e.currentTarget as HTMLInputElement).value)}
	/>
	<div class="flex flex-wrap items-center gap-2">
		<Select.Root type="single" value={locationFilter} onValueChange={(v: string | undefined) => (locationFilter = v || 'all')}>
			<Select.Trigger class="h-9 w-32 text-xs">
				{locationFilter === 'all' ? 'All Locations' : BOOK_LOCATION_LABELS[locationFilter as keyof typeof BOOK_LOCATION_LABELS]}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Locations" />
				<Select.Item value="home" label="Home" />
				<Select.Item value="apartment" label="Apartment" />
			</Select.Content>
		</Select.Root>
		<Select.Root type="single" value={sourceFilter} onValueChange={(v: string | undefined) => (sourceFilter = v || 'all')}>
			<Select.Trigger class="h-9 w-32 text-xs">
				{sourceFilter === 'all' ? 'All Sources' : BOOK_SOURCE_LABELS[sourceFilter as keyof typeof BOOK_SOURCE_LABELS]}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Sources" />
				<Select.Item value="bookstore" label="Bookstore" />
				<Select.Item value="bookfair" label="Bookfair" />
				<Select.Item value="online" label="Online" />
			</Select.Content>
		</Select.Root>
		<Select.Root type="single" value={draftFilter} onValueChange={(v: string | undefined) => (draftFilter = v || 'all')}>
			<Select.Trigger class="h-9 w-32 text-xs">
				{draftFilter === 'all' ? 'All Books' : 'Drafts Only'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Books" />
				<Select.Item value="drafts" label="Drafts Only" />
			</Select.Content>
		</Select.Root>
	</div>
</div>

<!-- Advanced Filter -->
<div class="mb-4">
	<AdvancedFilter
		columns={advancedFilterColumns}
		bind:conditions={advancedConditions}
		onchange={(c) => (advancedConditions = c)}
	/>
</div>

<!-- Table -->
<div class="rounded-md border border-border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#each columns as col}
					<Table.Head
						class={col.sortable ? 'cursor-pointer select-none whitespace-nowrap' : 'whitespace-nowrap'}
						onclick={() => col.sortable && toggleSort(col.key)}
					>
						<div class="flex items-center gap-1">
							{col.label}
							{#if col.sortable}
								{#if sortKey === col.key}
									{#if sortDir === 'asc'}
										<ArrowUp class="h-3.5 w-3.5" />
									{:else}
										<ArrowDown class="h-3.5 w-3.5" />
									{/if}
								{:else}
									<ChevronsUpDown class="h-3.5 w-3.5 text-muted-foreground/50" />
								{/if}
							{/if}
						</div>
					</Table.Head>
				{/each}
				<Table.Head class="w-[80px]"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each paginated() as row (row.id)}
				<Table.Row>
					<Table.Cell>
						<a href="/series/{row.seriesId}" class="font-medium text-foreground hover:underline">
							{row.seriesShortName}
						</a>
					</Table.Cell>
					<Table.Cell class="font-mono tabular-nums">{row.volumeNumber}</Table.Cell>
					<Table.Cell class="text-sm text-muted-foreground">
						{BOOK_LOCATION_LABELS[row.location]}
					</Table.Cell>
					<Table.Cell class="text-sm text-muted-foreground">
						{row.source ? BOOK_SOURCE_LABELS[row.source] : '—'}
					</Table.Cell>
					<Table.Cell class="text-sm text-muted-foreground">
						{formatDate(row.boughtAt)}
					</Table.Cell>
					<Table.Cell>
						{#if row.isDraft}
							<Badge variant="outline" class="text-xs text-amber-600 border-amber-300">
								Draft
							</Badge>
						{:else}
							<span class="text-xs text-muted-foreground/50">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<div class="flex items-center gap-1">
							{#if onEdit}
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-muted-foreground hover:text-foreground"
									onclick={() => onEdit?.(row)}
								>
									<Pencil class="h-3.5 w-3.5" />
								</Button>
							{/if}
							{#if onDelete}
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-muted-foreground hover:text-destructive"
									onclick={() => onDelete?.(row.id)}
								>
									<Trash2 class="h-3.5 w-3.5" />
								</Button>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length + 1} class="h-24 text-center">
						<EmptyState />
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<!-- Pagination -->
<div class="flex items-center justify-between px-2 py-4">
	<p class="text-sm text-muted-foreground">
		Showing {paginated().length} of {filtered().length} books
	</p>
	<div class="flex items-center gap-2">
		<Select.Root
			type="single"
			value={String(pageSize)}
			onValueChange={(v: string | undefined) => v && (pageSize = Number(v))}
		>
			<Select.Trigger class="h-8 w-20 text-xs">
				{pageSize} / page
			</Select.Trigger>
			<Select.Content>
				{#each [10, 25, 50, 100] as size}
					<Select.Item value={String(size)} label="{size} / page" />
				{/each}
			</Select.Content>
		</Select.Root>
		<div class="flex items-center gap-1">
			<Button
				variant="outline"
				size="sm"
				onclick={() => (pageIndex = Math.max(0, pageIndex - 1))}
				disabled={pageIndex === 0}
			>
				Previous
			</Button>
			<span class="text-sm text-muted-foreground px-2">
				{pageIndex + 1} / {pageCount()}
			</span>
			<Button
				variant="outline"
				size="sm"
				onclick={() => (pageIndex = Math.min(pageCount() - 1, pageIndex + 1))}
				disabled={pageIndex >= pageCount() - 1}
			>
				Next
			</Button>
		</div>
	</div>
</div>
