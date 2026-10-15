<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		id: string;
		title: string;
		description?: string;
		children: Snippet;
	};

	let { id, title, description, children }: Props = $props();
</script>

<section {id} class="scroll-mt-16 space-y-6 border-t border-border pt-8">
	<div>
		<h2 class="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
		{#if description}
			<p class="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{@render children()}
</section>
