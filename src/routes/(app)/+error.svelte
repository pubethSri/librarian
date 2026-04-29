<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle } from '@lucide/svelte';
</script>

<div class="flex flex-col items-center justify-center py-24 text-center">
	<div class="mb-6 rounded-full bg-muted p-4">
		<AlertTriangle class="h-10 w-10 text-muted-foreground" />
	</div>
	<h1 class="text-4xl font-bold tabular-nums text-foreground">{$page.status}</h1>
	<p class="mt-2 text-lg text-muted-foreground">
		{$page.error?.message || 'Something went wrong.'}
	</p>
	<div class="mt-6 flex gap-3">
		<Button variant="outline" onclick={() => history.back()}>Go Back</Button>
		<a
			href="/"
			class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Dashboard
		</a>
	</div>
</div>
