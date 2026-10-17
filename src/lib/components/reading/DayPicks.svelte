<script lang="ts">
	// Quick picks for a reading day: Today · Yesterday · Pick a day · Don't know.
	// `value` is a `YYYY-MM-DD` day, or null for "don't know".
	import { shiftDay } from '$lib/reading';

	let {
		value = $bindable(),
		today,
		label,
		large = false
	}: {
		value: string | null;
		/** The device's today, `YYYY-MM-DD` — also the latest day that can be picked */
		today: string;
		label: string;
		/** Phone-sized tap targets (Field Mode) */
		large?: boolean;
	} = $props();

	type Mode = 'today' | 'yesterday' | 'pick' | 'unknown';

	const yesterday = $derived(shiftDay(today, -1));

	function modeOf(v: string | null): Mode {
		if (v === null) return 'unknown';
		if (v === today) return 'today';
		if (v === yesterday) return 'yesterday';
		return 'pick';
	}

	// "Pick a day" stays open even when the picked day happens to be today
	let picking = $state(false);
	const mode = $derived(picking ? 'pick' : modeOf(value));

	function choose(next: Mode) {
		picking = next === 'pick';
		if (next === 'today') value = today;
		else if (next === 'yesterday') value = yesterday;
		else if (next === 'unknown') value = null;
		else if (value === null || value === today || value === yesterday) {
			value = shiftDay(today, -2);
		}
	}

	const OPTIONS: { mode: Mode; label: string }[] = [
		{ mode: 'today', label: 'Today' },
		{ mode: 'yesterday', label: 'Yesterday' },
		{ mode: 'pick', label: 'Pick a day' },
		{ mode: 'unknown', label: "Don't know" }
	];
</script>

<fieldset class="space-y-2">
	<legend class="mb-2 text-sm font-medium text-foreground">{label}</legend>
	<div class="grid grid-cols-2 gap-2 {large ? '' : 'sm:grid-cols-4'}">
		{#each OPTIONS as o (o.mode)}
			<button
				type="button"
				aria-pressed={mode === o.mode}
				onclick={() => choose(o.mode)}
				class="rounded-lg border text-sm font-medium transition-colors {large
					? 'h-12'
					: 'h-9'} {mode === o.mode
					? 'border-primary bg-primary text-primary-foreground'
					: 'border-border text-foreground hover:bg-accent active:bg-accent'}"
			>
				{o.label}
			</button>
		{/each}
	</div>
	{#if mode === 'pick'}
		<input
			type="date"
			max={today}
			value={value ?? ''}
			onchange={(e) => (value = e.currentTarget.value || null)}
			aria-label="{label} — day"
			class="w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 {large
				? 'h-12 text-base'
				: 'h-9'}"
		/>
	{/if}
</fieldset>
