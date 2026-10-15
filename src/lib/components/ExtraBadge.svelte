<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { volumeText, type VolumeLike } from '$lib/utils/volume';

	// Shown in place of an extra's volume number; hover says where it sits
	let { book, class: className = '' }: { book: VolumeLike; class?: string } = $props();

	const where = $derived(volumeText(book).replace(/^extra/, 'Extra'));
</script>

<Badge variant="secondary" class="text-xs {className}" title={where}>Extra</Badge>
