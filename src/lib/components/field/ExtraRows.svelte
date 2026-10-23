<script lang="ts">
	// The extras part of a phone sheet (Find's Add an extra, the Hitlist's Bought):
	// which volume they come after, and one title row per extra — the sort
	// positions are worked out on save (`extraPlan`). Titles used before are
	// offered as chips; a chip fills the first empty row, else adds one.
	import { Minus, Plus, X } from '@lucide/svelte';

	let {
		after = $bindable(),
		titles = $bindable(),
		suggestions = [],
		max = 999
	}: {
		/** The regular volume the extras follow (0 = before vol. 1) */
		after: number;
		/** One entry per extra; '' = no title */
		titles: string[];
		suggestions?: readonly string[];
		max?: number;
	} = $props();

	const offered = $derived(suggestions.filter((s) => !titles.includes(s)).slice(0, 4));

	function step(by: number) {
		after = Math.min(max, Math.max(0, after + by));
	}

	function pick(title: string) {
		const empty = titles.findIndex((t) => t.trim() === '');
		titles = empty >= 0 ? titles.map((t, i) => (i === empty ? title : t)) : [...titles, title];
	}

	function remove(index: number) {
		titles = titles.length > 1 ? titles.filter((_, i) => i !== index) : [''];
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-3">
		<div class="flex h-12 shrink-0 items-center rounded-xl border border-input">
			<button
				type="button"
				onclick={() => step(-1)}
				disabled={after <= 0}
				aria-label="Earlier volume"
				class="flex h-full w-12 items-center justify-center text-muted-foreground active:bg-accent disabled:opacity-30"
			>
				<Minus class="h-4 w-4" />
			</button>
			<span class="min-w-18 text-center text-lg font-semibold tabular-nums">
				{after < 1 ? 'start' : `vol. ${after}`}
			</span>
			<button
				type="button"
				onclick={() => step(1)}
				disabled={after >= max}
				aria-label="Later volume"
				class="flex h-full w-12 items-center justify-center text-muted-foreground active:bg-accent disabled:opacity-30"
			>
				<Plus class="h-4 w-4" />
			</button>
		</div>
		<p class="text-sm text-muted-foreground">
			{after < 1 ? 'before vol. 1' : `between vol. ${after} and ${after + 1}`}
		</p>
	</div>

	<div class="space-y-2">
		<p class="text-xs font-semibold text-muted-foreground">
			Title <span class="font-normal">(as printed on the book)</span>
		</p>
		{#each titles as _, i (i)}
			<div class="flex items-center gap-2">
				{#if titles.length > 1}
					<span class="w-5 shrink-0 text-center text-xs font-semibold text-highlight-ink">
						{i + 1}
					</span>
				{/if}
				<input
					bind:value={titles[i]}
					type="text"
					autocomplete="off"
					maxlength={200}
					enterkeyhint="done"
					placeholder="e.g. รวมตอนสั้น"
					aria-label="Title of extra {i + 1}"
					class="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
				/>
				{#if titles.length > 1 || titles[i] !== ''}
					<button
						type="button"
						onclick={() => remove(i)}
						aria-label="Remove extra {i + 1}"
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-accent"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>
		{/each}
		{#if offered.length > 0}
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="text-xs text-muted-foreground">Used before:</span>
				{#each offered as s (s)}
					<button
						type="button"
						onclick={() => pick(s)}
						class="h-8 max-w-full truncate rounded-full border border-border px-3 text-sm text-foreground active:bg-accent"
					>
						{s}
					</button>
				{/each}
			</div>
		{/if}
		<button
			type="button"
			onclick={() => (titles = [...titles, ''])}
			class="flex h-11 items-center gap-1.5 text-sm font-medium text-foreground"
		>
			<Plus class="h-4 w-4" />
			Another extra {after < 1 ? 'before vol. 1' : `after vol. ${after}`}
		</button>
	</div>
</div>
