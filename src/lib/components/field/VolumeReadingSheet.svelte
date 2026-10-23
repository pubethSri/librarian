<script lang="ts">
	// Bottom sheet behind an owned volume tile (and an Up next row): Started today ·
	// Finished… · Re-read finished… (STATUS.md → Reading-flow Decisions 2026-10-16),
	// then the reading queue: Add to queue / Remove, and Move to top on the Queue tab.
	// Starting or finishing takes a queued book out; a finish offers the next volume.
	// One request per tap: the reply is patched into the cached lists.
	import * as Sheet from '$lib/components/ui/sheet';
	import {
		ArrowUpToLine,
		BookOpen,
		CircleCheck,
		ListMinus,
		ListPlus,
		LoaderCircle,
		RotateCcw
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ReadForm, { type ReadFormResult } from '$lib/components/reading/ReadForm.svelte';
	import { createLogReadMutation, createReadingStatusMutation } from '$lib/queries/reading';
	import { createQueueAddMutation, createQueueRemoveMutation } from '$lib/queries/queue';
	import { nextToQueue, offerLabel } from '$lib/queue';
	import { formatDay } from '$lib/console/logic';
	import { todayLocal, type VolumeSlot } from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import { READING_STATUS_LABELS, type BookListItem } from '$lib/types';

	let {
		slot = $bindable(),
		seriesName,
		books = [],
		position = null,
		step = 'actions',
		onmovetop
	}: {
		/** The tile tapped; null = closed */
		slot: VolumeSlot | null;
		seriesName: string;
		/** The books list — finds the next volume to offer after a finish */
		books?: readonly BookListItem[];
		/** Place in the queue (1 = top), shown on the Queue tab */
		position?: number | null;
		/** Open on the actions, or straight on "When did you finish?" (swipe right) */
		step?: 'actions' | 'finish';
		/** Queue tab: Move to top */
		onmovetop?: () => void;
	} = $props();

	const statusMutation = createReadingStatusMutation({ patch: true });
	const logMutation = createLogReadMutation({ patch: true });
	const queueAdd = createQueueAddMutation();
	const queueRemove = createQueueRemoveMutation();
	const busy = $derived(
		statusMutation.isPending || logMutation.isPending || queueAdd.isPending || queueRemove.isPending
	);

	let finishing = $state(false);
	let today = $state(todayLocal());

	// Each opening starts on the actions, with a fresh "today"
	$effect(() => {
		if (slot) {
			finishing = step === 'finish';
			today = todayLocal();
		}
	});

	const name = $derived(
		slot
			? `${seriesName} ${volumeText({ volumeNumber: slot.volume, isExtra: slot.isExtra, title: slot.title })}`
			: ''
	);
	const isRead = $derived(slot?.status === 'read');

	function close() {
		slot = null;
	}

	async function startToday() {
		if (!slot?.bookId || busy) return;
		try {
			await statusMutation.mutateAsync({ bookId: slot.bookId, status: 'reading', on: today });
			toast.success(isRead ? `${name}: re-read started` : `${name}: reading`);
			close();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update reading status');
		}
	}

	async function toggleQueue() {
		if (!slot?.bookId || busy) return;
		try {
			if (slot.queuedId !== null) {
				await queueRemove.mutateAsync(slot.queuedId);
				toast.success(`${name}: removed from the queue`);
			} else {
				const item = await queueAdd.mutateAsync(slot.bookId);
				toast.success(`${name}: added to the queue`, {
					action: { label: 'Undo', onClick: () => queueRemove.mutate(item.bookId) }
				});
			}
			close();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update the queue');
		}
	}

	/** Toast options offering the next volume after finishing this one (`nextToQueue`) */
	function offerAfterFinish(bookId: number) {
		const book = books.find((b) => b.id === bookId);
		const next = book && nextToQueue(books, book, { reread: book.timesRead > 0 });
		if (!next) return undefined;
		return {
			action: {
				label: offerLabel(next),
				onClick: () =>
					queueAdd.mutate(next.id, {
						onSuccess: () => toast.success('Added to the queue'),
						onError: (err) => toast.error(err.message)
					})
			},
			duration: 8000
		};
	}

	async function finish(result: ReadFormResult) {
		if (!slot?.bookId || busy) return;
		const reread = isRead;
		const offer = offerAfterFinish(slot.bookId);
		try {
			await logMutation.mutateAsync({
				bookId: slot.bookId,
				finishedOn: result.finishedOn ?? null,
				startedOn: result.startedOn
			});
			const when = result.finishedOn ? ` (${formatDay(result.finishedOn)})` : '';
			toast.success(`${name}: ${reread ? 're-read logged' : 'read'}${when}`, offer);
			close();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to log the read');
		}
	}

	const action =
		'flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-4 text-left text-base font-medium text-foreground active:bg-accent disabled:opacity-50';
</script>

<Sheet.Root bind:open={() => slot !== null, (v) => !v && close()}>
	<Sheet.Content side="bottom" class="max-h-[85dvh] gap-0 rounded-t-2xl p-0">
		{#if slot}
			<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
				<Sheet.Title class="text-base">{name}</Sheet.Title>
				<Sheet.Description class="text-xs">
					{READING_STATUS_LABELS[slot.status]}{slot.copies > 1
						? ` · ${slot.copies} copies (applies to one)`
						: ''}{position
						? ` · #${position} in the queue`
						: slot.queuedId !== null
							? ' · in the queue'
							: ''}
				</Sheet.Description>
			</Sheet.Header>
			<div class="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				{#if finishing}
					<ReadForm
						kind="finish"
						{today}
						large
						keepsStart={slot.status === 'reading' || slot.status === 'dropped'}
						pending={busy}
						submitLabel={isRead ? 'Log re-read' : 'Mark read'}
						onsubmit={finish}
					/>
				{:else}
					<div class="space-y-2">
						{#if slot.status !== 'reading'}
							<button type="button" class={action} disabled={busy} onclick={startToday}>
								{#if statusMutation.isPending}
									<LoaderCircle class="h-5 w-5 animate-spin text-muted-foreground" />
								{:else}
									<BookOpen class="h-5 w-5 text-muted-foreground" />
								{/if}
								{isRead
									? 'Started a re-read today'
									: slot.status === 'dropped'
										? 'Reading it again'
										: 'Started today'}
							</button>
						{/if}
						<button type="button" class={action} disabled={busy} onclick={() => (finishing = true)}>
							{#if isRead}
								<RotateCcw class="h-5 w-5 text-muted-foreground" /> Re-read finished…
							{:else}
								<CircleCheck class="h-5 w-5 text-muted-foreground" /> Finished…
							{/if}
						</button>
						<div class="flex gap-2 pt-2">
							{#if onmovetop && slot.queuedId !== null}
								<button
									type="button"
									class="{action} flex-1 justify-center"
									disabled={busy || position === 1}
									onclick={() => {
										onmovetop?.();
										close();
									}}
								>
									<ArrowUpToLine class="h-5 w-5 text-muted-foreground" /> Move to top
								</button>
							{/if}
							<button
								type="button"
								class="{action} flex-1 {onmovetop ? 'justify-center' : ''}"
								disabled={busy}
								onclick={toggleQueue}
							>
								{#if queueAdd.isPending || queueRemove.isPending}
									<LoaderCircle class="h-5 w-5 animate-spin text-muted-foreground" />
								{:else if slot.queuedId !== null}
									<ListMinus class="h-5 w-5 text-muted-foreground" />
								{:else}
									<ListPlus class="h-5 w-5 text-muted-foreground" />
								{/if}
								{#if slot.queuedId === null}
									Add to reading queue
								{:else if onmovetop}
									Remove
								{:else}
									In queue ✓ · Remove
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
