<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { canonicalPublisher, distinctPublishers, matchPublishers } from '$lib/utils/publishers';

	let {
		id,
		value = $bindable('')
	}: {
		id: string;
		value: string;
	} = $props();

	const seriesQuery = createSeriesListQuery();
	const publishers = $derived(distinctPublishers((seriesQuery.data ?? []).map((s) => s.publisher)));

	let open = $state(false);
	let highlighted = $state(-1);

	const matches = $derived(matchPublishers(publishers, value));
	const existing = $derived(canonicalPublisher(publishers, value));
	// Hide the list once the field already holds exactly one existing name
	const showList = $derived(
		open && matches.length > 0 && !(matches.length === 1 && matches[0] === value)
	);
	// Only once nothing matches — while suggestions show, the name may still be one of them
	const isNew = $derived(value.trim() !== '' && existing === null && matches.length === 0);

	function choose(name: string) {
		value = name;
		open = false;
		highlighted = -1;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showList) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = (highlighted + 1) % matches.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = highlighted <= 0 ? matches.length - 1 : highlighted - 1;
		} else if (e.key === 'Enter' && highlighted >= 0) {
			e.preventDefault();
			choose(matches[highlighted]);
		} else if (e.key === 'Escape') {
			// Close the list without closing the dialog around it
			e.stopPropagation();
			open = false;
		}
	}

	function handleBlur() {
		open = false;
		highlighted = -1;
		// "phoenix next" → "Phoenix Next", so one publisher keeps one spelling
		if (existing && existing !== value) value = existing;
	}
</script>

<div class="relative">
	<Input
		{id}
		bind:value
		placeholder="Optional — type to search existing publishers"
		autocomplete="off"
		role="combobox"
		aria-expanded={showList}
		aria-controls="{id}-list"
		onfocus={() => (open = true)}
		oninput={() => {
			open = true;
			highlighted = -1;
		}}
		onblur={handleBlur}
		onkeydown={handleKeydown}
	/>
	{#if showList}
		<ul
			id="{id}-list"
			role="listbox"
			class="absolute top-full right-0 left-0 z-50 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
		>
			{#each matches as name, i (name)}
				<li role="option" aria-selected={i === highlighted}>
					<!-- mousedown, not click: it fires before the input's blur closes the list -->
					<button
						type="button"
						tabindex="-1"
						class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent {i ===
						highlighted
							? 'bg-accent'
							: ''}"
						onmousedown={(e) => {
							e.preventDefault();
							choose(name);
						}}
					>
						{name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if isNew}
		<p class="mt-1 text-xs text-muted-foreground">
			New publisher — no existing series uses "{value.trim()}".
		</p>
	{/if}
</div>
