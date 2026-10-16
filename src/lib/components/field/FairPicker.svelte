<script lang="ts">
	// "Where am I buying" chip for the Field Mode header: a bookfair (newest
	// first) or Not at a fair (= bookstore). Picking is remembered for the day.
	import * as Sheet from '$lib/components/ui/sheet';
	import { Check, ChevronDown, MapPin, Store } from '@lucide/svelte';
	import { formatDay } from '$lib/console/logic';
	import { fairsNewestFirst } from '$lib/field/logic';
	import type { FieldSettings } from '$lib/field/settings.svelte';
	import type { Bookfair } from '$lib/types';

	let { settings, fairs }: { settings: FieldSettings; fairs: readonly Bookfair[] | undefined } =
		$props();

	let open = $state(false);

	const sorted = $derived(fairsNewestFirst(fairs ?? []));
	const current = $derived(
		settings.fairId === null ? null : (fairs?.find((f) => f.id === settings.fairId) ?? null)
	);

	function pick(fairId: number | null) {
		settings.setFair(fairId);
		open = false;
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Trigger
		class="flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground active:bg-accent"
		aria-label="Where am I buying"
	>
		{#if !settings.ready}
			<span class="w-24 truncate text-muted-foreground">…</span>
		{:else if settings.fairId === null}
			<Store class="h-4 w-4 shrink-0 text-muted-foreground" />
			<span class="truncate">Not at a fair</span>
		{:else}
			<MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
			<span class="truncate">{current?.name ?? 'Bookfair'}</span>
		{/if}
		<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
	</Sheet.Trigger>

	<Sheet.Content side="bottom" class="max-h-[80dvh] gap-0 rounded-t-2xl p-0">
		<Sheet.Header class="border-b border-border px-5 pt-5 pb-3">
			<Sheet.Title class="text-base">Where am I buying?</Sheet.Title>
			<Sheet.Description class="text-xs">
				Books added from the phone get this source, dated today. Remembered until tomorrow.
			</Sheet.Description>
		</Sheet.Header>
		<ul class="overflow-y-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
			<li>
				<button
					type="button"
					onclick={() => pick(null)}
					class="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left active:bg-accent"
				>
					<Store class="h-5 w-5 shrink-0 text-muted-foreground" />
					<span class="min-w-0 flex-1">
						<span class="block text-base font-medium text-foreground">Not at a fair</span>
						<span class="block text-xs text-muted-foreground">Source: Bookstore</span>
					</span>
					{#if settings.fairId === null}<Check class="h-5 w-5 shrink-0" />{/if}
				</button>
			</li>
			{#each sorted as fair (fair.id)}
				<li>
					<button
						type="button"
						onclick={() => pick(fair.id)}
						class="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left active:bg-accent"
					>
						<MapPin class="h-5 w-5 shrink-0 text-muted-foreground" />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-base font-medium text-foreground">{fair.name}</span>
							<span class="block text-xs text-muted-foreground">
								{formatDay(fair.date)}{fair.location ? ` · ${fair.location}` : ''}
							</span>
						</span>
						{#if settings.fairId === fair.id}<Check class="h-5 w-5 shrink-0" />{/if}
					</button>
				</li>
			{/each}
		</ul>
	</Sheet.Content>
</Sheet.Root>
