<script lang="ts">
	import type { SeriesListItem, SeriesStatus, TagWithCount } from '$lib/types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TypeBadge from '$lib/components/TypeBadge.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import TagChipsBar from '$lib/components/TagChipsBar.svelte';
	import BooruSearchBar from '$lib/components/BooruSearchBar.svelte';
	import {
		type UnifiedFilterState,
		createEmptyFilterState,
		applyUnifiedFilter
	} from '$lib/components/filterEngine';
	import { parseBooruQuery, buildBooruQuery } from '$lib/utils/booruParser';
	import { Star, ArrowUp, ArrowDown, ChevronsUpDown } from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';

	type Props = {
		data: SeriesListItem[];
		allTags?: TagWithCount[];
		onStatusChange?: (id: number, status: SeriesStatus) => void;
		onWatchlistToggle?: (id: number, watchlist: boolean) => void;
	};

	let { data, allTags = [], onStatusChange, onWatchlistToggle }: Props = $props();

	// ─── Unified filter state ───────────────────────────────────────────────────
	let filterState = $state<UnifiedFilterState>(createEmptyFilterState());

	// Convenience getters/setters for quick filter dropdowns
	let typeFilter = $derived(filterState.quickFilters['type'] || 'all');
	let statusFilter = $derived(filterState.quickFilters['status'] || 'all');

	function setQuickFilter(key: string, value: string) {
		filterState.quickFilters = { ...filterState.quickFilters, [key]: value };
	}

	// ─── Booru search handler ──────────────────────────────────────────────────
	function handleBooruChange(query: string) {
		const parsed = parseBooruQuery(query);
		filterState.booruQuery = query;
		filterState.searchTerms = parsed.searchTerms;
		filterState.excludeTags = parsed.excludeTags;
		filterState.paramFilters = parsed.params;
	}

	// ─── Tag chip toggle (separate from booru search terms) ────────────────────
	function toggleTag(tagName: string) {
		const lower = tagName.toLowerCase();
		const idx = filterState.includeTags.findIndex((t) => t.toLowerCase() === lower);
		if (idx >= 0) {
			filterState.includeTags = filterState.includeTags.filter((_, i) => i !== idx);
		} else {
			filterState.includeTags = [...filterState.includeTags, tagName];
		}
	}

	function clearTags() {
		filterState.includeTags = [];
	}

	// ─── Sort state ─────────────────────────────────────────────────────────────
	let sortKey = $state<string>('shortName');
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

	// ─── Filter pipeline ────────────────────────────────────────────────────────
	const filtered = $derived(() => {
		return data.filter((row) =>
			applyUnifiedFilter(row as unknown as Record<string, unknown>, filterState, {
				searchFields: ['shortName', 'fullName'],
				getTagNames: (r) => {
					const typed = r as unknown as SeriesListItem;
					return typed.tags?.map((t) => t.name) || [];
				}
			})
		);
	});

	// Sorted data
	const sorted = $derived(() => {
		const items = [...filtered()];
		items.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'shortName':
					cmp = a.shortName.localeCompare(b.shortName);
					break;
				case 'type':
					cmp = a.type.localeCompare(b.type);
					break;
				case 'status':
					cmp = a.status.localeCompare(b.status);
					break;
				case 'publisher':
					cmp = (a.publisher || '').localeCompare(b.publisher || '');
					break;
				case 'volumes':
					cmp = a.bookCount - b.bookCount;
					break;
				case 'watchlist':
					cmp = Number(b.watchlist) - Number(a.watchlist);
					break;
				default:
					cmp = 0;
			}
			return sortDir === 'desc' ? -cmp : cmp;
		});
		return items;
	});

	// Paginated data
	const paginated = $derived(() => {
		const s = sorted();
		const start = pageIndex * pageSize;
		return s.slice(start, start + pageSize);
	});

	const pageCount = $derived(() => Math.max(1, Math.ceil(sorted().length / pageSize)));

	// Reset page when filters change
	$effect(() => {
		filterState.quickFilters;
		filterState.includeTags;
		filterState.excludeTags;
		filterState.paramFilters;
		filterState.searchTerms;
		pageIndex = 0;
	});

	type Column = { key: string; label: string; sortable: boolean };
	const columns: Column[] = [
		{ key: 'shortName', label: 'Name', sortable: true },
		{ key: 'type', label: 'Type', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'publisher', label: 'Publisher', sortable: true },
		{ key: 'tags', label: 'Tags', sortable: false },
		{ key: 'volumes', label: 'Volumes', sortable: true },
		{ key: 'watchlist', label: '★', sortable: true }
	];
</script>

<!-- Toolbar -->
<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
	<div class="w-full sm:max-w-sm">
		<BooruSearchBar
			allTags={allTags}
			bind:value={filterState.booruQuery}
			placeholder="Search... e.g. isekai status:ended volumes:>=4"
			onchange={handleBooruChange}
		/>
	</div>
	<div class="flex items-center gap-2">
		<Select.Root type="single" value={typeFilter} onValueChange={(v: string | undefined) => setQuickFilter('type', v || 'all')}>
			<Select.Trigger class="h-9 w-32 text-xs">
				{typeFilter === 'all' ? 'All Types' : typeFilter === 'light_novel' ? 'Light Novel' : 'Manga'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Types" />
				<Select.Item value="light_novel" label="Light Novel" />
				<Select.Item value="manga" label="Manga" />
			</Select.Content>
		</Select.Root>
		<Select.Root type="single" value={statusFilter} onValueChange={(v: string | undefined) => setQuickFilter('status', v || 'all')}>
			<Select.Trigger class="h-9 w-32 text-xs">
				{statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Status" />
				<Select.Item value="ongoing" label="Ongoing" />
				<Select.Item value="ended" label="Ended" />
				<Select.Item value="dropped" label="Dropped" />
			</Select.Content>
		</Select.Root>
	</div>
</div>

<!-- Tag Chips -->
{#if allTags.length > 0}
	<div class="mb-4">
		<TagChipsBar
			tags={allTags}
			activeTags={filterState.includeTags}
			ontoggle={toggleTag}
			onclear={clearTags}
		/>
	</div>
{/if}

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
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each paginated() as row (row.id)}
				<Table.Row class="group">
					<Table.Cell>
						<a href="/series/{row.id}" class="font-medium text-foreground hover:underline">
							{row.shortName}
						</a>
						<p class="text-xs text-muted-foreground truncate max-w-[200px]">{row.fullName}</p>
					</Table.Cell>
					<Table.Cell>
						<TypeBadge type={row.type} />
					</Table.Cell>
					<Table.Cell>
						<StatusBadge
							status={row.status}
							editable={!!onStatusChange}
							onchange={(newStatus: SeriesStatus) => onStatusChange?.(row.id, newStatus)}
						/>
					</Table.Cell>
					<Table.Cell class="text-sm text-muted-foreground">
						{row.publisher || '—'}
					</Table.Cell>
					<Table.Cell>
						{#if row.tags.length > 0}
							<div class="flex flex-wrap gap-1 max-w-[180px]">
								{#each row.tags.slice(0, 3) as tag}
									<Badge variant="outline" class="text-[10px] px-1.5 py-0">{tag.name}</Badge>
								{/each}
								{#if row.tags.length > 3}
									<span class="text-[10px] text-muted-foreground">+{row.tags.length - 3}</span>
								{/if}
							</div>
						{:else}
							<span class="text-xs text-muted-foreground/40">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<ProgressBar owned={row.bookCount} total={row.totalVolumes} />
					</Table.Cell>
					<Table.Cell>
						<button
							onclick={() => onWatchlistToggle?.(row.id, !row.watchlist)}
							class="transition-colors {row.watchlist
								? 'text-foreground'
								: 'text-muted-foreground/30 hover:text-muted-foreground/60'}"
						>
							<Star class="h-4 w-4 {row.watchlist ? 'fill-current' : ''}" />
						</button>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">
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
		Showing {paginated().length} of {filtered().length} series
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
				{#each [10, 25, 50] as size}
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
