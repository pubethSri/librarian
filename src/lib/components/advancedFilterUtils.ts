// ─── Advanced Filter Types & Utilities ──────────────────────────────────────

/** Column definition for filter options */
export type FilterColumnDef = {
	key: string;
	label: string;
	type: 'text' | 'select' | 'number' | 'boolean';
	options?: { value: string; label: string }[];
};

/** A single filter condition */
export type FilterCondition = {
	id: number;
	column: string;
	operator: string;
	value: string;
};

/** Apply a single filter condition to a data row */
export function applyCondition<T extends Record<string, unknown>>(
	row: T,
	condition: FilterCondition,
	columnDefs: FilterColumnDef[]
): boolean {
	const col = columnDefs.find((c) => c.key === condition.column);
	if (!col) return true;

	const rawValue = row[condition.column];
	const strValue = rawValue != null ? String(rawValue).toLowerCase() : '';
	const filterValue = condition.value.toLowerCase();

	switch (condition.operator) {
		case 'contains':
			return strValue.includes(filterValue);
		case 'equals':
			if (col.type === 'boolean') {
				return String(!!rawValue) === condition.value;
			}
			return strValue === filterValue;
		case 'not_equals':
			return strValue !== filterValue;
		case 'is_empty':
			return !rawValue || strValue === '';
		case 'is_not_empty':
			return !!rawValue && strValue !== '';
		case 'gt':
			return Number(rawValue) > Number(condition.value);
		case 'lt':
			return Number(rawValue) < Number(condition.value);
		case 'gte':
			return Number(rawValue) >= Number(condition.value);
		case 'lte':
			return Number(rawValue) <= Number(condition.value);
		default:
			return true;
	}
}
