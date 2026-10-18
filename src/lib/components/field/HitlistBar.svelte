<script lang="ts">
	// A Hitlist row's series at a glance (`hitlistBar` in $lib/field/logic): grey =
	// owned, red outline = missing, gold = the next to buy, gold outline = released
	// beyond it. `dark` on the black (released) cards. Decorative; the text says it.
	import type { HitlistBarModel, HitlistSegment } from '$lib/field/logic';

	let { model, dark = false }: { model: HitlistBarModel; dark?: boolean } = $props();

	const light: Record<HitlistSegment, string> = {
		owned: 'h-1 bg-bar-read',
		missing: 'h-1.5 ring-1 ring-red-400 ring-inset',
		next: 'h-1.5 bg-highlight',
		released: 'h-1.5 ring-[1.5px] ring-highlight ring-inset'
	};
	const onDark: Record<HitlistSegment, string> = {
		owned: 'h-1 bg-white/45',
		missing: 'h-1.5 ring-1 ring-red-300 ring-inset',
		next: 'h-1.5 bg-[#d8c27a]',
		released: 'h-1.5 ring-[1.5px] ring-[#d8c27a] ring-inset'
	};
	const look = $derived(dark ? onDark : light);
</script>

{#if model.kind === 'segments'}
	<span class="mt-1.5 flex w-full max-w-52 items-center gap-0.5" aria-hidden="true">
		{#each model.segments as segment, i (i)}
			<span class="flex-1 rounded-full {look[segment]}"></span>
		{/each}
	</span>
{:else}
	<span class="relative mt-1.5 block h-1.5 w-full max-w-52" aria-hidden="true">
		<span class="absolute inset-x-0 top-px h-1 rounded-full {dark ? 'bg-white/20' : 'bg-border'}"
		></span>
		<span
			class="absolute top-px left-0 h-1 rounded-full {dark ? 'bg-white/45' : 'bg-bar-read'}"
			style="width: {(model.owned / model.total) * 100}%"
		></span>
		<span
			class="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full {dark
				? 'bg-[#d8c27a]'
				: 'bg-highlight'}"
			style="left: {model.at * 100}%"
		></span>
	</span>
{/if}
