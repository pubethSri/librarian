<script lang="ts">
	import type { SeriesType } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';

	type Props = {
		type: SeriesType;
	};

	let { type }: Props = $props();

	const typeConfig: Record<SeriesType, { label: string; class: string }> = {
		light_novel: { label: 'LN', class: 'bg-secondary text-secondary-foreground' },
		manga: { label: 'Manga', class: 'bg-primary/10 text-primary' }
	};
</script>

<Badge variant="outline" class="text-xs font-mono {typeConfig[type].class}">
	{typeConfig[type].label}
</Badge>
