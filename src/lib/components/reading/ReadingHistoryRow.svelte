<script lang="ts">
	// One read-through in the history editor: its status, editable start / finish
	// days (calendar days; empty = unknown) and Delete.
	import { LoaderCircle, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { checkReadDays, rowDay } from '$lib/reading';
	import { createReadingDaysMutation, createReadingDeleteMutation } from '$lib/queries/reading';
	import { READING_STATUS_LABELS, type ReadingEntry } from '$lib/types';

	let { entry, today }: { entry: ReadingEntry; today: string } = $props();

	const saveDays = createReadingDaysMutation();
	const remove = createReadingDeleteMutation();

	let started = $state('');
	let finished = $state('');
	let confirming = $state(false);

	// Sync from the row whenever the server's copy changes
	$effect(() => {
		started = rowDay(entry.startedAt) ?? '';
		finished = rowDay(entry.finishedAt) ?? '';
	});

	const isRead = $derived(entry.status === 'read');
	const dirty = $derived(
		started !== (rowDay(entry.startedAt) ?? '') ||
			(isRead && finished !== (rowDay(entry.finishedAt) ?? ''))
	);
	const problem = $derived(checkReadDays(started || null, isRead ? finished || null : null, today));
	const busy = $derived(saveDays.isPending || remove.isPending);

	async function save() {
		if (!dirty || problem || busy) return;
		try {
			await saveDays.mutateAsync({
				bookId: entry.bookId,
				readingId: entry.id,
				startedOn: started || null,
				...(isRead && { finishedOn: finished || null })
			});
			toast.success('Reading days saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save the days');
		}
	}

	async function deleteRow() {
		if (!confirming) {
			confirming = true;
			return;
		}
		try {
			await remove.mutateAsync({ bookId: entry.bookId, readingId: entry.id });
			toast.success('Read-through deleted');
		} catch (err) {
			confirming = false;
			toast.error(err instanceof Error ? err.message : 'Failed to delete the read');
		}
	}

	const inputClass =
		'h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30';
</script>

<li class="space-y-2 rounded-lg border border-border p-3">
	<div class="flex items-center justify-between gap-2">
		<span class="text-sm font-medium text-foreground">{READING_STATUS_LABELS[entry.status]}</span>
		<button
			type="button"
			onclick={deleteRow}
			onblur={() => (confirming = false)}
			disabled={busy}
			class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors disabled:opacity-50 {confirming
				? 'bg-destructive text-white'
				: 'text-muted-foreground hover:bg-accent hover:text-destructive'}"
		>
			{#if remove.isPending}
				<LoaderCircle class="h-3.5 w-3.5 animate-spin" />
			{:else}
				<Trash2 class="h-3.5 w-3.5" />
			{/if}
			{confirming ? 'Delete?' : 'Delete'}
		</button>
	</div>
	<div class="grid grid-cols-2 gap-2">
		<label class="space-y-1">
			<span class="text-xs text-muted-foreground">Started</span>
			<input type="date" max={today} bind:value={started} class={inputClass} />
		</label>
		{#if isRead}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Finished</span>
				<input type="date" max={today} bind:value={finished} class={inputClass} />
			</label>
		{/if}
	</div>
	{#if problem}
		<p class="text-xs text-destructive" role="alert">{problem}</p>
	{/if}
	{#if dirty}
		<div class="flex justify-end gap-2">
			<button
				type="button"
				onclick={() => {
					started = rowDay(entry.startedAt) ?? '';
					finished = rowDay(entry.finishedAt) ?? '';
				}}
				class="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={save}
				disabled={!!problem || busy}
				class="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
			>
				{#if saveDays.isPending}<LoaderCircle class="h-3.5 w-3.5 animate-spin" />{/if}
				Save
			</button>
		</div>
	{/if}
</li>
