<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { Terminal, Calendar, MapPin } from '@lucide/svelte';
	import type { BookfairDetail, BookfairWithCount } from '$lib/types';
	import type { ScopeType } from '$lib/console/types';

	let {
		scopeType,
		scopeId,
		bookfair,
		bookfairs,
		onscopechange
	}: {
		scopeType: ScopeType;
		scopeId: number | null;
		/** The scoped bookfair, once its detail query resolves */
		bookfair: BookfairDetail | undefined;
		bookfairs: BookfairWithCount[] | undefined;
		onscopechange: (type: ScopeType, id?: number | null) => void;
	} = $props();
</script>

<div
	class="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3"
>
	<Terminal class="h-4 w-4 text-muted-foreground" />
	<div class="flex items-center gap-2">
		<Select.Root
			type="single"
			value={scopeType === 'all' ? 'all' : `${scopeType}:${scopeId}`}
			onValueChange={(val) => {
				if (val === 'all') {
					onscopechange('all');
				} else if (typeof val === 'string' && val.startsWith('bookfair:')) {
					onscopechange('bookfair', Number(val.split(':')[1]));
				}
			}}
		>
			<Select.Trigger class="w-56">
				{#if scopeType === 'bookfair' && bookfair}
					📍 {bookfair.name}
				{:else}
					All Books
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="All Books" />
				{#if bookfairs}
					<Select.Group>
						<Select.GroupHeading>Bookfairs</Select.GroupHeading>
						{#each bookfairs as bf (bf.id)}
							<Select.Item value={`bookfair:${bf.id}`} label={bf.name} />
						{/each}
					</Select.Group>
				{/if}
			</Select.Content>
		</Select.Root>
	</div>

	{#if scopeType === 'bookfair' && bookfair}
		{@const bf = bookfair}
		<div class="flex items-center gap-3 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<Calendar class="h-3 w-3" />
				{new Date(bf.date + 'T00:00:00').toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
			{#if bf.location}
				<span class="flex items-center gap-1">
					<MapPin class="h-3 w-3" />
					{bf.location}
				</span>
			{/if}
		</div>
	{/if}
</div>
