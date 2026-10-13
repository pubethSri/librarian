<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Plus, X, Zap } from '@lucide/svelte';
	import type { BulkEditStore } from '$lib/console/bulkEdit.svelte';

	let {
		bulk,
		onexecute
	}: {
		bulk: BulkEditStore;
		/** Opens the confirm dialog — the page owns the dialog and the mutation */
		onexecute: () => void;
	} = $props();
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
				{:else}
					Select action...
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="location" label="Change location to" />
				<Select.Item value="source" label="Set source to" />
				<Select.Item value="isDraft" label="Set draft status" />
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
							: bulk.value === 'bookfair'
								? 'Bookfair'
								: bulk.value === 'online'
									? 'Online'
									: 'Select...'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="bookstore" label="Bookstore" />
						<Select.Item value="bookfair" label="Bookfair" />
						<Select.Item value="online" label="Online" />
					</Select.Content>
				</Select.Root>
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

		{#if bulk.conditions.length === 0}
			<p class="text-xs text-muted-foreground">
				No conditions — all books in scope will be affected.
			</p>
		{:else}
			<div class="space-y-2">
				{#each bulk.conditions as cond, i (cond.id)}
					<div class="flex items-center gap-1.5">
						<span class="w-10 shrink-0 text-xs text-muted-foreground"
							>{i === 0 ? 'WHERE' : 'AND'}</span
						>
						<Select.Root type="single" bind:value={cond.column}>
							<Select.Trigger class="h-8 flex-1 text-xs">
								{cond.column}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="series" label="series" />
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
								<Select.Item value="=" label="=" />
								<Select.Item value="!=" label="!=" />
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
						{:else}
							<Input class="h-8 flex-1 text-xs" placeholder="value..." bind:value={cond.value} />
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
