// ─── Field Mode settings (per device) ───────────────────────────────────────
// Where am I buying + where the books go, shared by every Field Mode tab. The
// shell layout creates it and puts it in context; pages read it with
// `getFieldSettings()`. The rules are pure, in `./logic`.

import { getContext, setContext } from 'svelte';
import type { BookLocation } from '$lib/types';
import { currentFairId, parseFairChoice, todayLocal, type FairLike } from './logic';
import { readField, writeField } from './storage';

const KEY = Symbol('field-settings');

export function createFieldSettings(getFairs: () => readonly FairLike[] | undefined) {
	// Defaults until load() runs in the browser (storage and "today" are per device)
	let today = $state(todayLocal());
	let stored = $state(parseFairChoice(null));
	let location = $state<BookLocation>('apartment');
	let loaded = $state(false);

	const current = $derived(currentFairId(stored, getFairs(), today));

	return {
		/** Read the remembered values; call once the component is mounted */
		load() {
			today = todayLocal();
			stored = parseFairChoice(readField('purchase'));
			location = readField('location') === 'home' ? 'home' : 'apartment';
			loaded = true;
		},
		/**
		 * The remembered choice and the fair list are both in: until then the
		 * fair in effect isn't known, so nothing may be saved with it.
		 */
		get ready() {
			return loaded && getFairs() !== undefined;
		},
		/** A phone left open overnight: pick up the new day when it comes back */
		refreshDay() {
			today = todayLocal();
		},
		get today() {
			return today;
		},
		/** The bookfair in effect today; null = not at a fair (bookstore) */
		get fairId() {
			return current.fairId;
		},
		/** True when nothing was picked today and the dates chose */
		get suggested() {
			return current.suggested;
		},
		setFair(fairId: number | null) {
			stored = { day: today, fairId };
			writeField('purchase', JSON.stringify(stored));
		},
		get location() {
			return location;
		},
		set location(value: BookLocation) {
			location = value;
			writeField('location', value);
		}
	};
}

export type FieldSettings = ReturnType<typeof createFieldSettings>;

export function setFieldSettings(settings: FieldSettings): FieldSettings {
	return setContext(KEY, settings);
}

export function getFieldSettings(): FieldSettings {
	return getContext<FieldSettings>(KEY);
}
