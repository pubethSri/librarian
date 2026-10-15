<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { canonicalName, matchNames } from '$lib/utils/suggest';

	/**
	 * A text input that suggests values as you type: focusing lists every
	 * option, typing narrows them (case-insensitive substring), arrow keys +
	 * Enter or a click picks one, Escape closes the list without closing a
	 * dialog around it. Free text is still allowed.
	 */
	let {
		id,
		value = $bindable(''),
		options,
		placeholder = 'Optional',
		snap = true,
		newHint,
		onpick
	}: {
		id: string;
		value: string;
		/** The suggestions, already de-duplicated and ordered */
		options: readonly string[];
		placeholder?: string;
		/** On blur, replace a case/space variant of an option with its spelling */
		snap?: boolean;
		/** Shown when the typed text matches no option, e.g. "New publisher" */
		newHint?: string;
		/** Called when a suggestion is picked (not on free typing) */
		onpick?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let highlighted = $state(-1);

	const matches = $derived(matchNames(options, value));
	const existing = $derived(canonicalName(options, value));
	// Hide the list once the field already holds exactly one option
	const showList = $derived(
		open && matches.length > 0 && !(matches.length === 1 && matches[0] === value)
	);
	// Only once nothing matches — while suggestions show, the text may still be one of them
	const isNew = $derived(
		!!newHint && value.trim() !== '' && existing === null && matches.length === 0
	);

	function choose(option: string) {
		value = option;
		open = false;
		highlighted = -1;
		onpick?.(option);
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
		if (snap && existing && existing !== value) value = existing;
	}
</script>

<div class="relative">
	<Input
		{id}
		bind:value
		{placeholder}
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
			{#each matches as option, i (option)}
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
							choose(option);
						}}
					>
						{option}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if isNew}
		<p class="mt-1 text-xs text-muted-foreground">{newHint}</p>
	{/if}
</div>
