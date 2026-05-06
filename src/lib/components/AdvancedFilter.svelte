<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Filter, Plus, X } from '@lucide/svelte';
	import type { FilterColumnDef, FilterCondition } from '$lib/components/advancedFilterUtils';

	// Available operators per type
	const TEXT_OPERATORS = [
		{ value: 'contains', label: 'contains' },
		{ value: 'equals', label: 'equals' },
		{ value: 'not_equals', label: 'does not equal' },
		{ value: 'is_empty', label: 'is empty' },
		{ value: 'is_not_empty', label: 'is not empty' }
	];

	const SELECT_OPERATORS = [
		{ value: 'equals', label: 'is' },
		{ value: 'not_equals', label: 'is not' }
	];

	const NUMBER_OPERATORS = [
		{ value: 'equals', label: '=' },
		{ value: 'gt', label: '>' },
		{ value: 'lt', label: '<' },
		{ value: 'gte', label: '≥' },
		{ value: 'lte', label: '≤' }
	];

	const BOOLEAN_OPERATORS = [
		{ value: 'equals', label: 'is' }
	];

	type Props = {
		columns: FilterColumnDef[];
		conditions: FilterCondition[];
		onchange: (conditions: FilterCondition[]) => void;
	};

	let { columns, conditions = $bindable([]), onchange }: Props = $props();

	let isOpen = $state(false);
	let nextId = $state(1);

	function getOperators(colKey: string) {
		const col = columns.find((c) => c.key === colKey);
		if (!col) return TEXT_OPERATORS;
		switch (col.type) {
			case 'select':
				return SELECT_OPERATORS;
			case 'number':
				return NUMBER_OPERATORS;
			case 'boolean':
				return BOOLEAN_OPERATORS;
			default:
				return TEXT_OPERATORS;
		}
	}

	function getColumn(key: string) {
		return columns.find((c) => c.key === key);
	}

	function addCondition() {
		const firstCol = columns[0];
		if (!firstCol) return;
		const ops = getOperators(firstCol.key);
		conditions = [
			...conditions,
			{ id: nextId++, column: firstCol.key, operator: ops[0].value, value: '' }
		];
		onchange(conditions);
	}

	function removeCondition(id: number) {
		conditions = conditions.filter((c) => c.id !== id);
		onchange(conditions);
	}

	function updateCondition(id: number, field: 'column' | 'operator' | 'value', val: string) {
		conditions = conditions.map((c) => {
			if (c.id !== id) return c;
			const updated = { ...c, [field]: val };
			if (field === 'column') {
				const ops = getOperators(val);
				updated.operator = ops[0].value;
				updated.value = '';
			}
			if (field === 'operator' && (val === 'is_empty' || val === 'is_not_empty')) {
				updated.value = '';
			}
			return updated;
		});
		onchange(conditions);
	}

	function clearAll() {
		conditions = [];
		onchange(conditions);
	}

	const needsValue = (op: string) => op !== 'is_empty' && op !== 'is_not_empty';
</script>

<div class="flex items-center gap-2">
	<Button
		variant={conditions.length > 0 ? 'secondary' : 'outline'}
		size="sm"
		class="h-8 gap-1.5 text-xs"
		onclick={() => (isOpen = !isOpen)}
	>
		<Filter class="h-3.5 w-3.5" />
		Filters
		{#if conditions.length > 0}
			<span class="ml-0.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold">
				{conditions.length}
			</span>
		{/if}
	</Button>
	{#if conditions.length > 0}
		<Button variant="ghost" size="sm" class="h-8 text-xs text-muted-foreground" onclick={clearAll}>
			Clear all
		</Button>
	{/if}
</div>

{#if isOpen}
	<div class="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
		{#each conditions as condition (condition.id)}
			<div class="flex items-center gap-2 flex-wrap">
				<span class="text-xs text-muted-foreground w-10 shrink-0">
					{conditions.indexOf(condition) === 0 ? 'Where' : 'AND'}
				</span>

				<!-- Column selector -->
				<Select.Root
					type="single"
					value={condition.column}
					onValueChange={(v: string | undefined) => v && updateCondition(condition.id, 'column', v)}
				>
					<Select.Trigger class="h-8 w-32 text-xs">
						{getColumn(condition.column)?.label || condition.column}
					</Select.Trigger>
					<Select.Content>
						{#each columns as col}
							<Select.Item value={col.key} label={col.label} />
						{/each}
					</Select.Content>
				</Select.Root>

				<!-- Operator selector -->
				<Select.Root
					type="single"
					value={condition.operator}
					onValueChange={(v: string | undefined) => v && updateCondition(condition.id, 'operator', v)}
				>
					<Select.Trigger class="h-8 w-28 text-xs">
						{getOperators(condition.column).find((o) => o.value === condition.operator)?.label || condition.operator}
					</Select.Trigger>
					<Select.Content>
						{#each getOperators(condition.column) as op}
							<Select.Item value={op.value} label={op.label} />
						{/each}
					</Select.Content>
				</Select.Root>

				<!-- Value input -->
				{#if needsValue(condition.operator)}
					{@const col = getColumn(condition.column)}
					{#if col?.type === 'select' && col.options}
						<Select.Root
							type="single"
							value={condition.value}
							onValueChange={(v: string | undefined) => v && updateCondition(condition.id, 'value', v)}
						>
							<Select.Trigger class="h-8 w-32 text-xs">
								{col.options.find((o) => o.value === condition.value)?.label || 'Select...'}
							</Select.Trigger>
							<Select.Content>
								{#each col.options as opt}
									<Select.Item value={opt.value} label={opt.label} />
								{/each}
							</Select.Content>
						</Select.Root>
					{:else if col?.type === 'boolean'}
						<Select.Root
							type="single"
							value={condition.value}
							onValueChange={(v: string | undefined) => v && updateCondition(condition.id, 'value', v)}
						>
							<Select.Trigger class="h-8 w-24 text-xs">
								{condition.value === 'true' ? 'Yes' : condition.value === 'false' ? 'No' : 'Select...'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="true" label="Yes" />
								<Select.Item value="false" label="No" />
							</Select.Content>
						</Select.Root>
					{:else}
						<Input
							class="h-8 w-32 text-xs"
							type={col?.type === 'number' ? 'number' : 'text'}
							placeholder="Value..."
							value={condition.value}
							oninput={(e: Event) => updateCondition(condition.id, 'value', (e.currentTarget as HTMLInputElement).value)}
						/>
					{/if}
				{/if}

				<!-- Remove button -->
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
					onclick={() => removeCondition(condition.id)}
				>
					<X class="h-3.5 w-3.5" />
				</Button>
			</div>
		{/each}

		<Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-muted-foreground" onclick={addCondition}>
			<Plus class="h-3 w-3" />
			Add filter
		</Button>
	</div>
{/if}
