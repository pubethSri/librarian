<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Check, ChevronDown, RotateCcw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { createReadingStatusMutation } from '$lib/queries/reading';
	import { READING_STATUS_LABELS, type ReadingStatus } from '$lib/types';

	let {
		bookId,
		status,
		timesRead,
		label
	}: {
		bookId: number;
		/** Current status — derived from the reading rows (see $lib/reading) */
		status: ReadingStatus;
		timesRead: number;
		/** For the toast, e.g. "Arifureta vol. 3" */
		label: string;
	} = $props();

	const mutation = createReadingStatusMutation();

	const STATUSES: ReadingStatus[] = ['unread', 'reading', 'read', 'dropped'];

	const statusClass: Record<ReadingStatus, string> = {
		unread: 'text-muted-foreground',
		reading: 'border-sky-500/40 text-sky-700 dark:text-sky-400',
		read: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
		dropped: 'border-zinc-400/40 text-muted-foreground line-through'
	};

	async function setStatus(target: ReadingStatus) {
		if (target === status || mutation.isPending) return;
		const isReread = status === 'read' && target === 'reading';
		try {
			await mutation.mutateAsync({ bookId, status: target });
			toast.success(
				isReread ? `${label}: re-read started` : `${label}: ${READING_STATUS_LABELS[target]}`
			);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update reading status');
		}
	}
</script>

<div class="flex items-center gap-1">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					disabled={mutation.isPending}
					class="inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-accent disabled:opacity-50 {statusClass[
						status
					]}"
					title="Change reading status"
				>
					{READING_STATUS_LABELS[status]}
					{#if timesRead > 1}
						<span class="font-mono text-[10px] tabular-nums opacity-70">×{timesRead}</span>
					{/if}
					<ChevronDown class="h-3 w-3 opacity-60" />
				</button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-40">
			{#each STATUSES as s (s)}
				<DropdownMenu.Item onclick={() => setStatus(s)} disabled={s === status}>
					<Check class="mr-2 h-3.5 w-3.5 {s === status ? '' : 'invisible'}" />
					{s === 'reading' && status === 'read' ? 'Start re-read' : READING_STATUS_LABELS[s]}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<!-- One-tap action: Mark read, or Re-read once it's read -->
	{#if status === 'read'}
		<button
			class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
			title="Re-read"
			aria-label="Re-read {label}"
			disabled={mutation.isPending}
			onclick={() => setStatus('reading')}
		>
			<RotateCcw class="h-3.5 w-3.5" />
		</button>
	{:else}
		<button
			class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-emerald-600 disabled:opacity-50"
			title="Mark read"
			aria-label="Mark {label} read"
			disabled={mutation.isPending}
			onclick={() => setStatus('read')}
		>
			<Check class="h-3.5 w-3.5" />
		</button>
	{/if}
</div>
