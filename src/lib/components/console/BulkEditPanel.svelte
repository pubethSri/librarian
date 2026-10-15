<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { MousePointerClick, Plus, X, Zap } from '@lucide/svelte';
	import type { BulkEditStore } from '$lib/console/bulkEdit.svelte';
	import type { Condition } from '$lib/console/types';
	import SeriesSearch from '$lib/components/forms/SeriesSearch.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { formatDay, requiresExplicitTarget, UNKNOWN_DATE } from '$lib/console/logic';
	import { READING_STATUS_LABELS, type ReadingStatus } from '$lib/types';

	let {
		bulk,
		onexecute
	}: {
		bulk: BulkEditStore;
		/** Opens the confirm dialog — the page owns the dialog and the mutation */
		onexecute: () => void;
	} = $props();

	const READING_STATUSES: ReadingStatus[] = ['unread', 'reading', 'read', 'dropped'];

	const bookfairsQuery = createBookfairsListQuery();
	const selectedFair = $derived(
		bulk.action === 'bookfair'
			? bookfairsQuery.data?.find((bf) => String(bf.id) === bulk.value)
			: undefined
	);

	function formatFairDate(date: string): string {
		return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
	const TEXT_OPS = ['=', '!='] as const;
	const NUMERIC_OPS = ['=', '!=', '>', '<', '>=', '<='] as const;

	/** Switching column invalidates the old value, and the op unless it's `=`/`!=` */
	function resetForColumn(cond: Condition) {
		cond.value = '';
		if (cond.column !== 'volume' && cond.op !== '=' && cond.op !== '!=') cond.op = '=';
	}
</script>

<div class="space-y-5">
	<!-- Action selector -->
	<div class="space-y-2">
		<Label>Action</Label>
		<Select.Root
			type="single"
			bind:value={bulk.action}
			onValueChange={() => {
				bulk.value = '';
			}}
		>
			<Select.Trigger class="w-full">
				{#if bulk.action === 'location'}
					Change location to
				{:else if bulk.action === 'source'}
					Set source to
				{:else if bulk.action === 'isDraft'}
					Set draft status
				{:else if bulk.action === 'readingStatus'}
					Set reading status
				{:else if bulk.action === 'price'}
					Set price
				{:else if bulk.action === 'bookfair'}
					Link to bookfair
				{:else if bulk.action === 'boughtAt'}
					Set purchase date
				{:else}
					Select action...
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="location" label="Change location to" />
				<Select.Item value="source" label="Set source to" />
				<Select.Item value="isDraft" label="Set draft status" />
				<Select.Item value="readingStatus" label="Set reading status" />
				<Select.Item value="price" label="Set price" />
				<Select.Item value="bookfair" label="Link to bookfair" />
				<Select.Item value="boughtAt" label="Set purchase date" />
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Value selector (contextual) -->
	{#if bulk.action}
		<div class="space-y-2">
			<Label>Value</Label>
			{#if bulk.action === 'location'}
				<Select.Root type="single" bind:value={bulk.value}>
					<Select.Trigger class="w-full">
						{bulk.value === 'home'
							? 'Home'
							: bulk.value === 'apartment'
								? 'Apartment'
								: 'Select...'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="home" label="Home" />
						<Select.Item value="apartment" label="Apartment" />
					</Select.Content>
				</Select.Root>
			{:else if bulk.action === 'source'}
				<Select.Root type="single" bind:value={bulk.value}>
					<Select.Trigger class="w-full">
						{bulk.value === 'bookstore'
							? 'Bookstore'
							: bulk.value === 'online'
								? 'Online'
								: 'Select...'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="bookstore" label="Bookstore" />
						<Select.Item value="online" label="Online" />
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">
					For bookfair purchases use "Link to bookfair", which records which fair.
				</p>
			{:else if bulk.action === 'isDraft'}
				<Select.Root type="single" bind:value={bulk.value}>
					<Select.Trigger class="w-full">
						{bulk.value === 'true' ? 'Draft' : bulk.value === 'false' ? 'Not Draft' : 'Select...'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="true" label="Draft" />
						<Select.Item value="false" label="Not Draft" />
					</Select.Content>
				</Select.Root>
			{:else if bulk.action === 'readingStatus'}
				<Select.Root type="single" bind:value={bulk.value}>
					<Select.Trigger class="w-full">
						{READING_STATUS_LABELS[bulk.value as ReadingStatus] ?? 'Select...'}
					</Select.Trigger>
					<Select.Content>
						{#each READING_STATUSES as s (s)}
							<Select.Item value={s} label={READING_STATUS_LABELS[s]} />
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">
					Backfill: no dates are recorded. Re-reads are never created in bulk — a Read book set to
					Reading is skipped (use Re-read on the book).
				</p>
			{:else if bulk.action === 'bookfair'}
				<Select.Root type="single" bind:value={bulk.value}>
					<Select.Trigger class="w-full">
						{selectedFair?.name ?? 'Select bookfair...'}
					</Select.Trigger>
					<Select.Content>
						{#each bookfairsQuery.data ?? [] as bf (bf.id)}
							<Select.Item value={String(bf.id)} label={bf.name} />
						{/each}
					</Select.Content>
				</Select.Root>
				<div class="flex items-center justify-between gap-3 pt-1">
					<Label for="bulk-fair-date" class="text-xs font-normal text-muted-foreground">
						Also set purchase date to the fair's date{selectedFair
							? ` (${formatFairDate(selectedFair.date)})`
							: ''}
					</Label>
					<Switch id="bulk-fair-date" size="sm" bind:checked={bulk.setFairDate} />
				</div>
				<p class="text-xs text-muted-foreground">
					Sets the source to Bookfair and links the books to this fair.
				</p>
			{:else if bulk.action === 'boughtAt'}
				<div class="flex items-center gap-2">
					<Input
						type="date"
						class="h-9"
						value={bulk.value === UNKNOWN_DATE ? '' : bulk.value}
						oninput={(e) => (bulk.value = e.currentTarget.value)}
					/>
					<Button
						type="button"
						variant="outline"
						class="h-9 shrink-0"
						onclick={() => {
							const d = new Date();
							bulk.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
						}}
					>
						Today
					</Button>
					<Button
						type="button"
						variant={bulk.value === UNKNOWN_DATE ? 'default' : 'outline'}
						class="h-9 shrink-0"
						onclick={() => (bulk.value = UNKNOWN_DATE)}
					>
						Unknown
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					{bulk.value === UNKNOWN_DATE
						? 'Clears the purchase date (date unknown).'
						: bulk.value
							? `Sets the purchase date to ${formatDay(bulk.value)}.`
							: 'Pick a date, or Unknown to clear it.'}
				</p>
			{:else if bulk.action === 'price'}
				<Input
					type="number"
					min="0"
					step="1"
					placeholder="Price per book, e.g. 175"
					class="h-9 tabular-nums"
					value={bulk.value}
					oninput={(e) => (bulk.value = e.currentTarget.value)}
				/>
				<p class="text-xs text-muted-foreground">
					The list price is fine for books bought in a set — prices count as a lower bound.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Conditions -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<Label>Conditions</Label>
			<Button
				variant="ghost"
				size="sm"
				class="h-7 gap-1 text-xs"
				onclick={() => bulk.addCondition()}
			>
				<Plus class="h-3 w-3" />
				Add
			</Button>
		</div>

		{#if bulk.selectedCount > 0}
			<div
				class="flex items-center justify-between gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs"
			>
				<span class="flex items-center gap-1.5">
					<MousePointerClick class="h-3.5 w-3.5 text-sky-600" />
					<span>
						Using <span class="font-medium">{bulk.selectedCount} selected</span> — conditions are ignored
					</span>
				</span>
				<button
					class="shrink-0 font-medium text-sky-700 hover:underline dark:text-sky-400"
					onclick={() => bulk.clearSelection()}
				>
					Clear selection
				</button>
			</div>
		{/if}

		{#if bulk.conditions.length === 0}
			<p class="text-xs text-muted-foreground">
				{#if bulk.selectedCount === 0 && requiresExplicitTarget(bulk.action)}
					Pick the books: click rows in the preview (Shift+click for a range), or add a condition.
				{:else if bulk.selectedCount === 0}
					No conditions — all books in scope will be affected. Or click rows in the preview to pick
					them (Shift+click for a range).
				{/if}
			</p>
		{:else}
			<div class="space-y-2 {bulk.selectedCount > 0 ? 'pointer-events-none opacity-40' : ''}">
				{#each bulk.conditions as cond, i (cond.id)}
					<div class="flex items-center gap-1.5">
						<span class="w-10 shrink-0 text-xs text-muted-foreground"
							>{i === 0 ? 'WHERE' : 'AND'}</span
						>
						<Select.Root
							type="single"
							bind:value={cond.column}
							onValueChange={() => resetForColumn(cond)}
						>
							<Select.Trigger class="h-8 flex-1 text-xs">
								{cond.column}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="series" label="series" />
								<Select.Item value="volume" label="volume" />
								<Select.Item value="reading" label="reading" />
								<Select.Item value="location" label="location" />
								<Select.Item value="source" label="source" />
								<Select.Item value="isDraft" label="isDraft" />
							</Select.Content>
						</Select.Root>
						<Select.Root type="single" bind:value={cond.op}>
							<Select.Trigger class="h-8 w-14 text-xs">
								{cond.op}
							</Select.Trigger>
							<Select.Content>
								{#each cond.column === 'volume' ? NUMERIC_OPS : TEXT_OPS as op (op)}
									<Select.Item value={op} label={op} />
								{/each}
							</Select.Content>
						</Select.Root>
						{#if cond.column === 'location'}
							<Select.Root type="single" bind:value={cond.value}>
								<Select.Trigger class="h-8 flex-1 text-xs">
									{cond.value || 'value...'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="home" label="home" />
									<Select.Item value="apartment" label="apartment" />
								</Select.Content>
							</Select.Root>
						{:else if cond.column === 'reading'}
							<Select.Root type="single" bind:value={cond.value}>
								<Select.Trigger class="h-8 flex-1 text-xs">
									{cond.value || 'value...'}
								</Select.Trigger>
								<Select.Content>
									{#each READING_STATUSES as s (s)}
										<Select.Item value={s} label={s} />
									{/each}
								</Select.Content>
							</Select.Root>
						{:else if cond.column === 'source'}
							<Select.Root type="single" bind:value={cond.value}>
								<Select.Trigger class="h-8 flex-1 text-xs">
									{cond.value || 'value...'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="bookstore" label="bookstore" />
									<Select.Item value="bookfair" label="bookfair" />
									<Select.Item value="online" label="online" />
								</Select.Content>
							</Select.Root>
						{:else if cond.column === 'isDraft'}
							<Select.Root type="single" bind:value={cond.value}>
								<Select.Trigger class="h-8 flex-1 text-xs">
									{cond.value || 'value...'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="true" label="true" />
									<Select.Item value="false" label="false" />
								</Select.Content>
							</Select.Root>
						{:else if cond.column === 'volume'}
							<Input
								type="number"
								min="0"
								step="0.5"
								class="h-8 min-w-16 flex-1 text-xs tabular-nums"
								placeholder="vol..."
								value={cond.value}
								oninput={(e) => (cond.value = e.currentTarget.value)}
							/>
						{:else}
							<!-- series: the value is a series id, picked like in Add Books -->
							<div class="min-w-0 flex-[2] [&_button]:h-8 [&_button]:text-xs">
								<SeriesSearch
									value={cond.value ? Number(cond.value) : null}
									onselect={(s) => (cond.value = String(s.id))}
								/>
							</div>
						{/if}
						<button
							class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
							onclick={() => bulk.removeCondition(cond.id)}
						>
							<X class="h-3 w-3" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Affected summary + Execute -->
	{#if bulk.action && bulk.value}
		<div class="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
			<p class="text-sm">
				<span class="font-medium text-amber-600">{bulk.affectedBooks.length}</span>
				<span class="text-muted-foreground">
					book{bulk.affectedBooks.length !== 1 ? 's' : ''} will be updated</span
				>
			</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" class="flex-1 text-xs" onclick={() => bulk.reset()}>Reset</Button>
			<Button class="flex-1 gap-1.5" disabled={bulk.affectedBooks.length === 0} onclick={onexecute}>
				<Zap class="h-3.5 w-3.5" />
				Execute
			</Button>
		</div>
	{/if}
</div>
