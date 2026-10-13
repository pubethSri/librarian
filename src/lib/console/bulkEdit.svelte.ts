import { SvelteSet } from 'svelte/reactivity';
import type { BookListItem } from '$lib/types';
import type { BulkAction, Condition } from './types';
import { matchesConditions, selectBooks, toAffectedIds } from './logic';

/**
 * Bulk-edit form state for the Console: the action, its value, and which
 * books it applies to — either rows picked in the preview (the selection) or,
 * when nothing is selected, the conditions.
 *
 * A factory rather than module-level `$state`, for the same reason as
 * {@link createStagingStore} — see `staging.svelte.ts`.
 *
 * @param getBooks   the books currently in scope, as a getter so the derived
 *                   set stays reactive across the module boundary
 * @param getIsActive whether the Bulk Edit tab is the open one. Preserves the
 *                   existing gate: with the tab closed nothing is reported as
 *                   affected, so the preview drops its amber highlighting.
 *                   Deliberate, not a bug.
 */
export function createBulkEditStore(getBooks: () => BookListItem[], getIsActive: () => boolean) {
	let action = $state<BulkAction>('');
	let value = $state<string>('');
	let conditions = $state<Condition[]>([]);
	// A reactive set: reads in $derived / templates track adds and deletes
	const selectedIds = new SvelteSet<string>();

	const affectedBooks = $derived.by<BookListItem[]>(() => {
		if (!getIsActive() || !action || !value) return [];
		const books = getBooks();
		// A selection, when present, replaces the conditions
		if (selectedIds.size > 0) return selectBooks(books, selectedIds);
		return books.filter((b) => matchesConditions(b, conditions));
	});

	const affectedBookIds = $derived.by<Set<string>>(() => toAffectedIds(affectedBooks));

	/** Selected ids that are still in scope (a scope change can strand some) */
	const selectedCount = $derived(selectBooks(getBooks(), selectedIds).length);

	return {
		// Two-way bound from the panel, so these need setters as well as getters
		get action() {
			return action;
		},
		set action(v: BulkAction) {
			action = v;
		},
		get value() {
			return value;
		},
		set value(v: string) {
			value = v;
		},

		get isActive() {
			return getIsActive();
		},

		/** The live array — `bind:value={cond.column}` in the panel writes through it */
		get conditions() {
			return conditions;
		},
		get affectedBooks() {
			return affectedBooks;
		},
		get affectedBookIds() {
			return affectedBookIds;
		},

		get selectedIds(): ReadonlySet<string> {
			return selectedIds;
		},
		get selectedCount() {
			return selectedCount;
		},

		toggleSelected(id: string) {
			if (selectedIds.has(id)) selectedIds.delete(id);
			else selectedIds.add(id);
		},

		/** Add ids to the selection (shift-click range, select all visible) */
		addSelected(ids: string[]) {
			for (const id of ids) selectedIds.add(id);
		},

		removeSelected(ids: string[]) {
			for (const id of ids) selectedIds.delete(id);
		},

		clearSelection() {
			selectedIds.clear();
		},

		addCondition() {
			conditions = [
				...conditions,
				{ id: crypto.randomUUID(), column: 'location', op: '=', value: '' }
			];
		},

		removeCondition(id: string) {
			conditions = conditions.filter((c) => c.id !== id);
		},

		reset() {
			action = '';
			value = '';
			conditions = [];
			selectedIds.clear();
		}
	};
}

export type BulkEditStore = ReturnType<typeof createBulkEditStore>;
