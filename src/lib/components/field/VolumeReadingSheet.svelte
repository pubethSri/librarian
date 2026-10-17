<script lang="ts">
	// Bottom sheet behind an owned volume tile: Started today · Finished… ·
	// Re-read finished… (STATUS.md → Reading-flow Decisions 2026-10-16).
	// One request per tap: the reply is patched into the cached books list.
	import * as Sheet from '$lib/components/ui/sheet';
	import { BookOpen, CircleCheck, LoaderCircle, RotateCcw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ReadForm, { type ReadFormResult } from '$lib/components/reading/ReadForm.svelte';
	import { createLogReadMutation, createReadingStatusMutation } from '$lib/queries/reading';
	import { formatDay } from '$lib/console/logic';
	import { todayLocal, type VolumeSlot } from '$lib/field/logic';
	import { volumeText } from '$lib/utils/volume';
	import { READING_STATUS_LABELS } from '$lib/types';

	let {
		slot = $bindable(),
		seriesName
	}: {
		/** The tile tapped; null = closed */
		slot: VolumeSlot | null;
		seriesName: string;
	} = $props();

	const statusMutation = createReadingStatusMutation({ patch: true });
	const logMutation = createLogReadMutation({ patch: true });
	const busy = $derived(statusMutation.isPending || logMutation.isPending);

	let finishing = $state(false);
	let today = $state(todayLocal());

	// Each opening starts on the actions, with a fresh "today"
	$effect(() => {
		if (slot) {
			finishing = false;
			today = todayLocal();
		}
	});

	const name = $derived(
		slot ? `${seriesName} ${volumeText({ volumeNumber: slot.volume, isExtra: slot.isExtra })}` : ''
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

	async function finish(result: ReadFormResult) {
		if (!slot?.bookId || busy) return;
		const reread = isRead;
		try {
			await logMutation.mutateAsync({
				bookId: slot.bookId,
				finishedOn: result.finishedOn ?? null,
				startedOn: result.startedOn
			});
			const when = result.finishedOn ? ` (${formatDay(result.finishedOn)})` : '';
			toast.success(`${name}: ${reread ? 're-read logged' : 'read'}${when}`);
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
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
