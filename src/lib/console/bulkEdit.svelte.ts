import type { BookListItem } from '$lib/types';
import type { BulkAction, Condition } from './types';
import { matchesConditions, toAffectedIds } from './logic';

/**
 * Bulk-edit form state for the Console: the action, its value, and the
 * conditions that select which books it applies to.
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

	const affectedBooks = $derived.by<BookListItem[]>(() => {
		if (!getIsActive() || !action || !value) return [];
		return getBooks().filter((b) => matchesConditions(b, conditions));
	});

	const affectedBookIds = $derived.by<Set<string>>(() => toAffectedIds(affectedBooks));

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
		}
	};
}

export type BulkEditStore = ReturnType<typeof createBulkEditStore>;
