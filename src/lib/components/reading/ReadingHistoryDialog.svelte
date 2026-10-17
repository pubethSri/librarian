<script lang="ts">
	// Every read-through of one book, newest first: edit the days, delete a
	// mistaken one. Current status and times read follow (they stay derived).
	import * as Dialog from '$lib/components/ui/dialog';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ReadingHistoryRow from './ReadingHistoryRow.svelte';
	import { createReadingHistoryQuery } from '$lib/queries/reading';
	import { todayLocal } from '$lib/field/logic';

	let {
		open = $bindable(),
		bookId,
		label
	}: { open: boolean; bookId: number; label: string } = $props();

	const history = createReadingHistoryQuery(() => (open ? bookId : null));
	const today = $derived(open ? todayLocal() : '');
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Reading history</Dialog.Title>
			<Dialog.Description>{label} — newest first. Empty days are unknown.</Dialog.Description>
		</Dialog.Header>
		{#if history.isPending}
			<div class="space-y-2">
				<Skeleton class="h-20 rounded-lg" />
				<Skeleton class="h-20 rounded-lg" />
			</div>
		{:else if history.isError}
			<p class="text-sm text-destructive">{history.error.message}</p>
		{:else if history.data.length === 0}
			<p class="py-4 text-sm text-muted-foreground">Not read yet — no read-throughs recorded.</p>
		{:else}
			<ul class="max-h-[60vh] space-y-2 overflow-y-auto">
				{#each history.data as entry (entry.id)}
					<ReadingHistoryRow {entry} {today} />
				{/each}
			</ul>
		{/if}
	</Dialog.Content>
</Dialog.Root>
