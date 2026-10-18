<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Check,
		ChevronDown,
		History,
		ListMinus,
		ListOrdered,
		ListPlus,
		RotateCcw
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ReadForm, { type ReadFormResult } from '$lib/components/reading/ReadForm.svelte';
	import ReadingHistoryDialog from '$lib/components/reading/ReadingHistoryDialog.svelte';
	import { createLogReadMutation, createReadingStatusMutation } from '$lib/queries/reading';
	import { createQueueAddMutation, createQueueRemoveMutation } from '$lib/queries/queue';
	import { formatDay } from '$lib/console/logic';
	import { todayLocal } from '$lib/field/logic';
	import { READING_STATUS_LABELS, type ReadingStatus } from '$lib/types';

	let {
		bookId,
		status,
		timesRead,
		label,
		queued,
		queueMark = true,
		nextOffer
	}: {
		bookId: number;
		/** Current status — derived from the reading rows (see $lib/reading) */
		status: ReadingStatus;
		timesRead: number;
		/** For the toast, e.g. "Arifureta vol. 3" */
		label: string;
		/** In the reading queue; leave out to hide the queue items */
		queued?: boolean;
		/** Show a small queue icon when queued (off on /queue itself) */
		queueMark?: boolean;
		/** After "I read this": the next volume to offer for the queue (`nextToQueue`) */
		nextOffer?: (reread: boolean) => { bookId: number; action: string } | null;
	} = $props();

	const statusMutation = createReadingStatusMutation();
	const logMutation = createLogReadMutation();
	const queueAdd = createQueueAddMutation();
	const queueRemove = createQueueRemoveMutation();
	const busy = $derived(statusMutation.isPending || logMutation.isPending);

	async function toggleQueue() {
		try {
			if (queued) {
				await queueRemove.mutateAsync(bookId);
				toast.success(`${label}: removed from the queue`);
			} else {
				await queueAdd.mutateAsync(bookId);
				toast.success(`${label}: added to the queue`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update the queue');
		}
	}

	function queueOffered(offeredId: number) {
		queueAdd.mutate(offeredId, {
			onSuccess: () => toast.success('Added to the queue'),
			onError: (err) => toast.error(err.message)
		});
	}

	const STATUSES: ReadingStatus[] = ['unread', 'reading', 'read', 'dropped'];

	const statusClass: Record<ReadingStatus, string> = {
		unread: 'text-muted-foreground',
		reading: 'border-info/40 text-info-ink',
		read: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
		dropped: 'border-zinc-400/40 text-muted-foreground line-through'
	};

	/** The day-picks dialog: finish = "I read this" (a re-read on a Read book), start = started reading */
	let form = $state<{ kind: 'finish' | 'start'; today: string } | null>(null);
	let historyOpen = $state(false);

	const isRead = $derived(status === 'read');

	function openForm(kind: 'finish' | 'start') {
		form = { kind, today: todayLocal() };
	}

	function onDay(day: string | null | undefined): string {
		return day ? ` (${formatDay(day)})` : '';
	}

	/** A dropdown pick: Reading and Read ask for the day; the rest apply at once */
	function pick(target: ReadingStatus) {
		if (target === status || busy) return;
		if (target === 'read') return openForm('finish');
		// Dropped → Reading resumes the read-through (keeps its start), so no day to ask
		if (target === 'reading' && status !== 'dropped') return openForm('start');
		setStatus(target, todayLocal());
	}

	async function setStatus(target: ReadingStatus, on: string | null) {
		const isReread = status === 'read' && target === 'reading';
		try {
			await statusMutation.mutateAsync({ bookId, status: target, on });
			toast.success(
				isReread
					? `${label}: re-read started${onDay(on)}`
					: `${label}: ${READING_STATUS_LABELS[target]}${target === 'reading' ? onDay(on) : ''}`
			);
			form = null;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update reading status');
		}
	}

	async function submit(result: ReadFormResult) {
		if (!form) return;
		if (form.kind === 'start') return setStatus('reading', result.startedOn ?? null);
		const reread = isRead;
		const offer = nextOffer?.(timesRead > 0) ?? null;
		try {
			await logMutation.mutateAsync({
				bookId,
				finishedOn: result.finishedOn ?? null,
				startedOn: result.startedOn
			});
			toast.success(`${label}: ${reread ? 're-read logged' : 'read'}${onDay(result.finishedOn)}`, {
				...(offer && {
					action: { label: offer.action, onClick: () => queueOffered(offer.bookId) },
					duration: 8000
				})
			});
			form = null;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to log the read');
		}
	}

	const formTitle = $derived(
		form?.kind === 'start'
			? isRead
				? 'Started a re-read'
				: 'Started reading'
			: isRead
				? 'Read it again'
				: 'I read this'
	);
</script>

<div class="flex items-center gap-1">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					disabled={busy}
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
		<DropdownMenu.Content align="start" class="w-48">
			{#each STATUSES as s (s)}
				{#if s === 'read' && isRead}
					<DropdownMenu.Item onclick={() => openForm('finish')}>
						<RotateCcw class="mr-2 h-3.5 w-3.5" />
						Read it again…
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Item onclick={() => pick(s)} disabled={s === status}>
						<Check class="mr-2 h-3.5 w-3.5 {s === status ? '' : 'invisible'}" />
						{#if s === 'reading' && isRead}
							Start re-read…
						{:else if s === 'reading' && status !== 'dropped'}
							Reading…
						{:else if s === 'read'}
							I read this…
						{:else}
							{READING_STATUS_LABELS[s]}
						{/if}
					</DropdownMenu.Item>
				{/if}
			{/each}
			<DropdownMenu.Separator />
			{#if queued !== undefined}
				<DropdownMenu.Item onclick={toggleQueue}>
					{#if queued}
						<ListMinus class="mr-2 h-3.5 w-3.5" />
						In queue ✓ · Remove
					{:else}
						<ListPlus class="mr-2 h-3.5 w-3.5" />
						Add to queue
					{/if}
				</DropdownMenu.Item>
			{/if}
			<DropdownMenu.Item onclick={() => (historyOpen = true)}>
				<History class="mr-2 h-3.5 w-3.5" />
				Reading history…
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	{#if queued && queueMark}
		<span class="text-muted-foreground" title="In the reading queue">
			<ListOrdered class="h-3.5 w-3.5" aria-label="In the reading queue" />
		</span>
	{/if}

	<!-- One-tap action: I read this, or log a re-read once it's read -->
	<button
		class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-50 {isRead
			? 'hover:text-foreground'
			: 'hover:text-emerald-600'}"
		title={isRead ? 'Read it again' : 'I read this'}
		aria-label={isRead ? `Log a re-read of ${label}` : `I read ${label}`}
		disabled={busy}
		onclick={() => openForm('finish')}
	>
		{#if isRead}
			<RotateCcw class="h-3.5 w-3.5" />
		{:else}
			<Check class="h-3.5 w-3.5" />
		{/if}
	</button>
</div>

<Dialog.Root bind:open={() => form !== null, (v) => !v && (form = null)}>
	<Dialog.Content class="sm:max-w-md">
		{#if form}
			<Dialog.Header>
				<Dialog.Title>{formTitle}</Dialog.Title>
				<Dialog.Description>{label}</Dialog.Description>
			</Dialog.Header>
			<ReadForm
				kind={form.kind}
				today={form.today}
				keepsStart={form.kind === 'finish' && (status === 'reading' || status === 'dropped')}
				pending={busy}
				submitLabel={form.kind === 'start' ? 'Start reading' : isRead ? 'Log re-read' : 'Mark read'}
				onsubmit={submit}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

{#if historyOpen}
	<ReadingHistoryDialog bind:open={historyOpen} {bookId} {label} />
{/if}
