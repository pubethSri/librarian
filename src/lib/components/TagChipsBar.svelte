<script lang="ts">
	import type { TagWithCount } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import { X } from '@lucide/svelte';

	type Props = {
		/** All available tags */
		tags: TagWithCount[];
		/** Currently active (included) tag names */
		activeTags: string[];
		/** Called when a tag is toggled */
		ontoggle: (tagName: string) => void;
		/** Called to clear all active tags */
		onclear: () => void;
	};

	let { tags, activeTags, ontoggle, onclear }: Props = $props();

	function isActive(name: string): boolean {
		return activeTags.some((t) => t.toLowerCase() === name.toLowerCase());
	}

	// Sort: active tags first, then alphabetically
	const sortedTags = $derived(() => {
		return [...tags].sort((a, b) => {
			const aActive = isActive(a.name);
			const bActive = isActive(b.name);
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			return a.name.localeCompare(b.name);
		});
	});
</script>

{#if tags.length > 0}
	<div class="flex flex-wrap items-center gap-1.5">
		<span class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mr-1">
			Tags
		</span>
		{#each sortedTags() as tag (tag.id)}
			<button onclick={() => ontoggle(tag.name)}>
				<Badge
					variant={isActive(tag.name) ? 'default' : 'outline'}
					class="cursor-pointer text-[11px] px-2 py-0.5 transition-all hover:scale-105 {isActive(tag.name)
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground hover:border-foreground/30'}"
				>
					{tag.name}
					<span class="ml-1 opacity-50">{tag.seriesCount}</span>
				</Badge>
			</button>
		{/each}
		{#if activeTags.length > 0}
			<button
				onclick={onclear}
				class="ml-1 flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
			>
				<X class="h-3 w-3" />
				Clear
			</button>
		{/if}
	</div>
{/if}
