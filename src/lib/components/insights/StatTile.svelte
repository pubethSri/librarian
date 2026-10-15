<script lang="ts">
	type Props = {
		label: string;
		value: string;
		/** A second line: coverage, a unit, a caveat */
		sub?: string | null;
	};

	let { label, value, sub = null }: Props = $props();
</script>

<div class="min-w-0">
	<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
	<p class="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground">{value}</p>
	{#if sub}
		<p class="mt-0.5 text-xs text-muted-foreground">{sub}</p>
	{/if}
</div>
