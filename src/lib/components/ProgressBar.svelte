<script lang="ts">
	type Props = {
		owned: number;
		total: number | null;
	};

	let { owned, total }: Props = $props();

	const percentage = total && total > 0 ? Math.min((owned / total) * 100, 100) : 0;
	const isComplete = total !== null && owned >= total;
</script>

<div class="flex items-center gap-2 text-sm">
	<span class="font-mono tabular-nums text-foreground">
		{owned}{#if total !== null}<span class="text-muted-foreground">/{total}</span>{/if}
	</span>
	{#if total !== null && total > 0}
		<div class="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
			<div
				class="h-full rounded-full transition-all duration-300 {isComplete ? 'bg-foreground' : 'bg-foreground/50'}"
				style="width: {percentage}%"
			></div>
		</div>
	{/if}
</div>
