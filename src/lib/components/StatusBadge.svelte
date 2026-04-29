<script lang="ts">
	import type { SeriesStatus } from '$lib/types';
	import { SERIES_STATUS_LABELS } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';

	type Props = {
		status: SeriesStatus;
		editable?: boolean;
		onchange?: (newStatus: SeriesStatus) => void;
	};

	let { status, editable = false, onchange }: Props = $props();

	const statusVariants: Record<SeriesStatus, string> = {
		ongoing: 'bg-foreground/10 text-foreground border-foreground/20',
		ended: 'bg-muted text-muted-foreground border-muted-foreground/20',
		dropped: 'bg-destructive/10 text-destructive border-destructive/20'
	};

	function handleChange(value: string | undefined) {
		if (value && onchange) {
			onchange(value as SeriesStatus);
		}
	}
</script>

{#if editable}
	<Select.Root type="single" value={status} onValueChange={handleChange}>
		<Select.Trigger class="h-7 w-auto gap-1 border-0 px-2 text-xs font-medium {statusVariants[status]} hover:opacity-80 transition-opacity">
			{SERIES_STATUS_LABELS[status]}
		</Select.Trigger>
		<Select.Content>
			{#each Object.entries(SERIES_STATUS_LABELS) as [value, label]}
				<Select.Item {value} {label} />
			{/each}
		</Select.Content>
	</Select.Root>
{:else}
	<Badge variant="outline" class="text-xs {statusVariants[status]}">
		{SERIES_STATUS_LABELS[status]}
	</Badge>
{/if}
