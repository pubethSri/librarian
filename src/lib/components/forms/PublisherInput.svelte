<script lang="ts">
	import SuggestInput from '$lib/components/forms/SuggestInput.svelte';
	import { createSeriesListQuery } from '$lib/queries/series';
	import { distinctNames } from '$lib/utils/suggest';

	let {
		id,
		value = $bindable('')
	}: {
		id: string;
		value: string;
	} = $props();

	const seriesQuery = createSeriesListQuery();
	const publishers = $derived(distinctNames((seriesQuery.data ?? []).map((s) => s.publisher)));
</script>

<!-- Snaps "phoenix next" → "Phoenix Next", so one publisher keeps one spelling -->
<SuggestInput
	{id}
	bind:value
	options={publishers}
	placeholder="Optional — type to search existing publishers"
	newHint={`New publisher — no existing series uses "${value.trim()}".`}
/>
