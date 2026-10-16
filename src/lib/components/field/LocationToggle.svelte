<script lang="ts">
	// Apartment / Home for books added from the phone; remembered per device
	// through the Field Mode settings.
	import { BOOK_LOCATION_LABELS } from '$lib/types';
	import type { FieldSettings } from '$lib/field/settings.svelte';

	let { settings }: { settings: FieldSettings } = $props();

	const LOCATIONS = ['apartment', 'home'] as const;
</script>

<div
	role="radiogroup"
	aria-label="Location"
	class="flex h-12 shrink-0 gap-1 rounded-xl border border-input p-1"
>
	{#each LOCATIONS as loc (loc)}
		<button
			type="button"
			role="radio"
			aria-checked={settings.location === loc}
			onclick={() => (settings.location = loc)}
			class="rounded-lg px-3 text-sm font-medium transition-colors {settings.location === loc
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground active:bg-accent'}"
		>
			{BOOK_LOCATION_LABELS[loc]}
		</button>
	{/each}
</div>
