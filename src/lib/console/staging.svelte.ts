import type { StagedBookEntry } from '$lib/types';

/**
 * Staged (not yet committed) book additions for the Console.
 *
 * A factory rather than module-level `$state`: a module singleton would
 * survive client-side navigation away from /console and back, so staged
 * entries would silently reappear in a later session.
 */
export function createStagingStore() {
	let entries = $state<StagedBookEntry[]>([]);

	return {
		get entries() {
			return entries;
		},

		/** `tempId` is stamped here so the pure logic stays deterministic */
		add(newEntries: Omit<StagedBookEntry, 'tempId'>[]) {
			entries = [...entries, ...newEntries.map((e) => ({ ...e, tempId: crypto.randomUUID() }))];
		},

		remove(tempId: string) {
			entries = entries.filter((e) => e.tempId !== tempId);
		},

		clear() {
			entries = [];
		}
	};
}

export type StagingStore = ReturnType<typeof createStagingStore>;
