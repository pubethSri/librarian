<script lang="ts">
	import type { TagWithCount } from '$lib/types';
	import { Search, X } from '@lucide/svelte';

	type Props = {
		/** All available tags for autocomplete */
		allTags?: TagWithCount[];
		/** Current query text (bindable for external sync) */
		value: string;
		/** Placeholder text */
		placeholder?: string;
		/** Called when the query text changes (debounced) */
		onchange: (query: string) => void;
	};

	let {
		allTags = [],
		value = $bindable(''),
		placeholder = 'Search... e.g. isekai status:ended volumes:>=4',
		onchange
	}: Props = $props();

	// ─── Autocomplete state ─────────────────────────────────────────────────────
	let inputEl = $state<HTMLInputElement | null>(null);
	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	// Known parameter suggestions
	const PARAM_SUGGESTIONS: Record<string, { label: string; values: string[] }> = {
		'status:': { label: 'Status', values: ['ongoing', 'ended', 'dropped'] },
		'type:': { label: 'Type', values: ['ln', 'manga'] },
		'source:': { label: 'Source', values: ['bookstore', 'bookfair', 'online'] },
		'location:': { label: 'Location', values: ['home', 'apartment'] },
		'watchlist:': { label: 'Watchlist', values: ['yes', 'no'] },
		'draft:': { label: 'Draft', values: ['yes', 'no'] },
		'volumes:': { label: 'Volumes', values: ['>=', '<=', '>', '<'] },
		'publisher:': { label: 'Publisher', values: [] },
		'name:': { label: 'Name', values: [] }
	};

	// Get the last token being typed (for suggestions)
	function getLastToken(text: string): string {
		const parts = text.split(/\s+/);
		return parts[parts.length - 1] || '';
	}

	// Generate suggestions based on current input
	const suggestions = $derived(() => {
		const lastToken = getLastToken(value);
		if (!lastToken) return [];

		const results: { label: string; value: string; type: 'tag' | 'param' | 'paramValue' }[] = [];

		// Check if typing a param value (e.g., "status:on")
		const colonIdx = lastToken.indexOf(':');
		if (colonIdx > 0) {
			const paramKey = lastToken.slice(0, colonIdx + 1).toLowerCase();
			const paramValue = lastToken.slice(colonIdx + 1).toLowerCase();
			const paramDef = PARAM_SUGGESTIONS[paramKey];
			if (paramDef && paramDef.values.length > 0) {
				for (const val of paramDef.values) {
					if (!paramValue || val.toLowerCase().startsWith(paramValue)) {
						results.push({
							label: `${paramKey}${val}`,
							value: `${paramKey}${val}`,
							type: 'paramValue'
						});
					}
				}
				return results;
			}
		}

		const lower = lastToken.toLowerCase();
		const isExclude = lower.startsWith('-');
		const searchTerm = isExclude ? lower.slice(1) : lower;

		// Suggest matching tags
		if (searchTerm) {
			for (const tag of allTags) {
				if (tag.name.toLowerCase().includes(searchTerm)) {
					const prefix = isExclude ? '-' : '';
					results.push({
						label: `${prefix}${tag.name} (${tag.seriesCount})`,
						value: `${prefix}${tag.name}`,
						type: 'tag'
					});
				}
			}
		}

		// Suggest matching param keys
		if (!isExclude) {
			for (const key of Object.keys(PARAM_SUGGESTIONS)) {
				if (key.startsWith(lower) && key !== lower) {
					results.push({
						label: key,
						value: key,
						type: 'param'
					});
				}
			}
		}

		return results.slice(0, 8); // Limit suggestions
	});

	// Apply a suggestion — replace the last token
	function applySuggestion(suggestion: string) {
		const parts = value.split(/\s+/);
		parts[parts.length - 1] = suggestion;

		// If suggestion ends with ":" (param key), don't add space
		const newValue = suggestion.endsWith(':') ? parts.join(' ') : parts.join(' ') + ' ';

		value = newValue;
		showSuggestions = false;
		selectedIndex = -1;
		emitChange(newValue);
		// Focus back on input
		inputEl?.focus();
	}

	function emitChange(query: string) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onchange(query);
		}, 150);
	}

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		value = target.value;
		showSuggestions = true;
		selectedIndex = -1;
		emitChange(value);
	}

	function handleKeydown(e: KeyboardEvent) {
		const items = suggestions();
		if (!showSuggestions || items.length === 0) {
			if (e.key === 'Escape') {
				(e.currentTarget as HTMLInputElement).blur();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % items.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
				break;
			case 'Tab':
			case 'Enter':
				if (selectedIndex >= 0 && selectedIndex < items.length) {
					e.preventDefault();
					applySuggestion(items[selectedIndex].value);
				} else if (e.key === 'Enter') {
					showSuggestions = false;
				}
				break;
			case 'Escape':
				e.preventDefault();
				showSuggestions = false;
				selectedIndex = -1;
				break;
		}
	}

	function handleFocus() {
		if (value) showSuggestions = true;
	}

	function handleBlur() {
		// Delay to allow clicking suggestions
		setTimeout(() => {
			showSuggestions = false;
			selectedIndex = -1;
		}, 200);
	}

	function clearInput() {
		value = '';
		showSuggestions = false;
		emitChange('');
		inputEl?.focus();
	}
</script>

<div class="relative">
	<!-- Search input -->
	<div class="relative">
		<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
		<input
			bind:this={inputEl}
			type="text"
			{placeholder}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm font-mono text-foreground ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			autocomplete="off"
			spellcheck="false"
		/>
		{#if value}
			<button
				onclick={clearInput}
				class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
				tabindex={-1}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		{/if}
	</div>

	<!-- Autocomplete dropdown -->
	{#if showSuggestions && suggestions().length > 0}
		<div
			class="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
		>
			{#each suggestions() as suggestion, i (suggestion.value)}
				<button
					class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors
						{i === selectedIndex
							? 'bg-accent text-accent-foreground'
							: 'text-popover-foreground hover:bg-accent/50'}"
					onmousedown={(e: MouseEvent) => { e.preventDefault(); applySuggestion(suggestion.value); }}
				>
					{#if suggestion.type === 'tag'}
						<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">T</span>
					{:else if suggestion.type === 'param'}
						<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10 text-[9px] font-bold text-blue-500">P</span>
					{:else}
						<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-500">V</span>
					{/if}
					<span class="font-mono text-xs">{suggestion.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
