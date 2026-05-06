// ─── Unified Filter Engine ──────────────────────────────────────────────────
// Single source of truth for all filter types and logic.
// Used by SeriesTable, BooksTable, TagChipsBar, and BooruSearchBar.

/** A single parameter filter (from booru syntax or programmatic) */
export type ParamFilter = {
	key: string; // 'status', 'volumes', 'publisher', etc.
	op: string; // '=', '!=', '>', '<', '>=', '<='
	value: string;
};

/** The unified filter state — all filter UIs read/write this */
export type UnifiedFilterState = {
	/** Quick filters from dropdowns */
	quickFilters: Record<string, string>; // { type: 'manga', status: 'all' }

	/** Tags to include (from chips and/or booru syntax) */
	includeTags: string[];

	/** Tags to exclude (from booru syntax `-tag`) */
	excludeTags: string[];

	/** Parameter filters (from booru syntax `key:value`) */
	paramFilters: ParamFilter[];

	/** Raw booru query text (for the input field) */
	booruQuery: string;
};

/** Create a fresh empty filter state */
export function createEmptyFilterState(): UnifiedFilterState {
	return {
		quickFilters: {},
		includeTags: [],
		excludeTags: [],
		paramFilters: [],
		booruQuery: ''
	};
}

// ─── Column definitions (reused from old advancedFilterUtils) ────────────────

export type FilterColumnDef = {
	key: string;
	label: string;
	type: 'text' | 'select' | 'number' | 'boolean';
	options?: { value: string; label: string }[];
};

// ─── Unified Filter Application ─────────────────────────────────────────────

type FilterableRow = Record<string, unknown>;

/**
 * Apply all parts of the unified filter state to a single row.
 * Returns true if the row passes ALL conditions (AND logic).
 */
export function applyUnifiedFilter<T extends FilterableRow>(
	row: T,
	state: UnifiedFilterState,
	options: {
		/** Fields to search when booruQuery contains bare words (name search) */
		searchFields?: string[];
		/** How to extract tag names from a row (for tag filtering) */
		getTagNames?: (row: T) => string[];
	} = {}
): boolean {
	const { searchFields = [], getTagNames } = options;

	// 1. Quick filters
	for (const [key, value] of Object.entries(state.quickFilters)) {
		if (value === 'all' || value === '') continue;
		const rowValue = row[key];
		if (rowValue == null || String(rowValue) !== value) return false;
	}

	// 2. Include tags — row must have ALL included tags
	if (state.includeTags.length > 0 && getTagNames) {
		const rowTags = getTagNames(row).map((t) => t.toLowerCase());
		for (const tag of state.includeTags) {
			if (!rowTags.some((rt) => rt.includes(tag.toLowerCase()))) return false;
		}
	}

	// 3. Exclude tags — row must have NONE of the excluded tags
	if (state.excludeTags.length > 0 && getTagNames) {
		const rowTags = getTagNames(row).map((t) => t.toLowerCase());
		for (const tag of state.excludeTags) {
			if (rowTags.some((rt) => rt.includes(tag.toLowerCase()))) return false;
		}
	}

	// 4. Parameter filters (from booru syntax)
	for (const pf of state.paramFilters) {
		if (!applyParamFilter(row, pf)) return false;
	}

	return true;
}

/**
 * Apply a single param filter to a row.
 */
function applyParamFilter(row: FilterableRow, pf: ParamFilter): boolean {
	const rawValue = row[pf.key];
	const strValue = rawValue != null ? String(rawValue).toLowerCase() : '';
	const filterValue = pf.value.toLowerCase();

	switch (pf.op) {
		case '=':
			// For booleans, handle 'true'/'false'
			if (filterValue === 'true' || filterValue === 'false') {
				return String(!!rawValue) === filterValue;
			}
			// For text, use contains for more forgiving matching
			return strValue.includes(filterValue) || strValue === filterValue;
		case '!=':
			return strValue !== filterValue && !strValue.includes(filterValue);
		case '>':
			return Number(rawValue) > Number(pf.value);
		case '<':
			return Number(rawValue) < Number(pf.value);
		case '>=':
			return Number(rawValue) >= Number(pf.value);
		case '<=':
			return Number(rawValue) <= Number(pf.value);
		default:
			return true;
	}
}

/**
 * Simple text search across multiple fields.
 * Returns true if ANY field contains the search string.
 */
export function matchesTextSearch(
	row: FilterableRow,
	searchText: string,
	fields: string[]
): boolean {
	if (!searchText) return true;
	const s = searchText.toLowerCase();
	return fields.some((field) => {
		const val = row[field];
		return val != null && String(val).toLowerCase().includes(s);
	});
}
