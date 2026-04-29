<script lang="ts">
	import type { Component } from 'svelte';
	import { SearchX } from '@lucide/svelte';

	type Props = {
		icon?: Component;
		title?: string;
		description?: string;
	};

	let {
		icon: Icon = SearchX,
		title = 'No results found',
		description = 'Try adjusting your search or filters.'
	}: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 text-center">
	<div class="mb-4 rounded-full bg-muted p-4">
		<Icon class="h-8 w-8 text-muted-foreground" />
	</div>
	<h3 class="text-lg font-semibold text-foreground">{title}</h3>
	<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
</div>
