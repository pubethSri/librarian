<script lang="ts" module>
	export type ReadFormResult = { finishedOn?: string | null; startedOn?: string | null };
</script>

<script lang="ts">
	// The day picks behind "I read this" (finish day + optional start day) and
	// "Started reading" (start day). Shared by the desktop dialog and the phone sheet.
	import { LoaderCircle, Plus } from '@lucide/svelte';
	import DayPicks from './DayPicks.svelte';
	import { checkReadDays } from '$lib/reading';

	let {
		kind,
		today,
		keepsStart = false,
		large = false,
		pending = false,
		submitLabel,
		onsubmit
	}: {
		/** finish = log a finished read-through; start = start reading */
		kind: 'finish' | 'start';
		today: string;
		/** The book is mid-read: a start day already recorded is kept unless one is picked */
		keepsStart?: boolean;
		large?: boolean;
		pending?: boolean;
		submitLabel: string;
		/** startedOn undefined = keep the recorded start (finish only) */
		onsubmit: (result: ReadFormResult) => void;
	} = $props();

	// Re-created each time the dialog / sheet opens, so plain initial values are right
	// svelte-ignore state_referenced_locally
	let finishedOn = $state<string | null>(today);
	// svelte-ignore state_referenced_locally
	let startedOn = $state<string | null>(today);
	let withStart = $state(false);

	const sendsStart = $derived(kind === 'start' || withStart);
	const problem = $derived(
		checkReadDays(sendsStart ? startedOn : null, kind === 'finish' ? finishedOn : null, today)
	);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (problem || pending) return;
		onsubmit(
			kind === 'start'
				? { startedOn }
				: { finishedOn, startedOn: withStart ? startedOn : undefined }
		);
	}
</script>

<form onsubmit={submit} class="space-y-5">
	{#if kind === 'finish'}
		<DayPicks label="Finished" {today} {large} bind:value={finishedOn} />
		{#if withStart}
			<DayPicks label="Started" {today} {large} bind:value={startedOn} />
		{:else}
			<div>
				<button
					type="button"
					onclick={() => {
						withStart = true;
						startedOn = finishedOn ?? today;
					}}
					class="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground {large
						? 'h-11'
						: 'h-8'}"
				>
					<Plus class="h-4 w-4" /> Add the day I started (optional)
				</button>
				{#if keepsStart}
					<p class="text-xs text-muted-foreground">A start day already recorded is kept.</p>
				{/if}
			</div>
		{/if}
	{:else}
		<DayPicks label="Started" {today} {large} bind:value={startedOn} />
	{/if}

	{#if problem}
		<p class="text-sm text-destructive" role="alert">{problem}</p>
	{/if}

	<button
		type="submit"
		disabled={!!problem || pending}
		class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity disabled:opacity-50 {large
			? 'h-14 text-base'
			: 'h-10 text-sm'}"
	>
		{#if pending}<LoaderCircle class="h-4 w-4 animate-spin" />{/if}
		{submitLabel}
	</button>
</form>
