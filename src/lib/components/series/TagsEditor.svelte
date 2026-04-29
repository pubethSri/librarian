<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { createTagsListQuery, createSeriesTagsMutation } from '$lib/queries/tags';
	import type { Tag } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { Check } from '@lucide/svelte';

	type Props = {
		open: boolean;
		seriesId: number;
		currentTags: Tag[];
	};

	let { open = $bindable(false), seriesId, currentTags }: Props = $props();

	const tagsQuery = createTagsListQuery();
	const tagsMutation = createSeriesTagsMutation();

	let selectedIds = $state<Set<number>>(new Set(currentTags.map((t) => t.id)));

	$effect(() => {
		selectedIds = new Set(currentTags.map((t) => t.id));
	});

	function toggleTag(id: number) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	function handleSave() {
		tagsMutation.mutate(
			{ seriesId, tagIds: Array.from(selectedIds) },
			{
				onSuccess: () => {
					toast.success('Tags updated');
					open = false;
				},
				onError: (err: Error) => toast.error(err.message)
			}
		);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Tags</Dialog.Title>
			<Dialog.Description>Select tags for this series.</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			{#if tagsQuery.isPending}
				<p class="text-sm text-muted-foreground">Loading tags...</p>
			{:else if tagsQuery.data}
				{#if tagsQuery.data.length === 0}
					<p class="text-sm text-muted-foreground">
						No tags exist yet. Create some from the Tags page.
					</p>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each tagsQuery.data as tag}
							<button
								onclick={() => toggleTag(tag.id)}
								class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors {selectedIds.has(tag.id)
									? 'border-foreground bg-foreground text-background'
									: 'border-border bg-background text-foreground hover:bg-accent'}"
							>
								{#if selectedIds.has(tag.id)}
									<Check class="h-3 w-3" />
								{/if}
								{tag.name}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSave} disabled={tagsMutation.isPending}>
				{tagsMutation.isPending ? 'Saving...' : 'Save Tags'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
