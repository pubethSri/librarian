import { describe, it, expect } from 'vitest';
import { findSameVolume, latestVolume, volumeLabel, volumeText } from './volume';

describe('volumeLabel', () => {
	it('shows a regular volume as its number, without the stored decimal', () => {
		expect(volumeLabel({ volumeNumber: '5.0', isExtra: false })).toBe('5');
		expect(volumeLabel({ volumeNumber: 12, isExtra: false })).toBe('12');
	});

	it('shows an extra as "Extra", never its sort position', () => {
		expect(volumeLabel({ volumeNumber: '4.5', isExtra: true })).toBe('Extra');
	});
});

describe('volumeText', () => {
	it('names a regular volume', () => {
		expect(volumeText({ volumeNumber: '3.0', isExtra: false })).toBe('vol. 3');
	});

	it('places an extra after the volume it sorts behind', () => {
		expect(volumeText({ volumeNumber: '4.5', isExtra: true })).toBe('extra (after vol. 4)');
		expect(volumeText({ volumeNumber: '11.5', isExtra: true })).toBe('extra (after vol. 11)');
	});

	it('places an extra sorted first before vol. 1', () => {
		expect(volumeText({ volumeNumber: '0.5', isExtra: true })).toBe('extra (before vol. 1)');
	});
});

describe('latestVolume', () => {
	it('ignores extras, even when one sorts last', () => {
		expect(
			latestVolume([
				{ volumeNumber: '8.0', isExtra: false },
				{ volumeNumber: '9.0', isExtra: false },
				{ volumeNumber: '9.5', isExtra: true }
			])
		).toBe(9);
	});

	it('is 0 when there are no regular volumes', () => {
		expect(latestVolume([])).toBe(0);
		expect(latestVolume([{ volumeNumber: '0.5', isExtra: true }])).toBe(0);
	});
});

describe('findSameVolume', () => {
	const books = [
		{ id: 1, volumeNumber: '3.0', isExtra: false },
		{ id: 2, volumeNumber: '4.5', isExtra: true },
		{ id: 3, volumeNumber: '5.0', isExtra: false }
	];

	it('matches a stored "3.0" against a typed 3', () => {
		expect(findSameVolume(books, { volumeNumber: 3, isExtra: false })?.id).toBe(1);
	});

	it('needs the same extra flag', () => {
		expect(findSameVolume(books, { volumeNumber: 4.5, isExtra: false })).toBeNull();
		expect(findSameVolume(books, { volumeNumber: '4.5', isExtra: true })?.id).toBe(2);
		expect(findSameVolume(books, { volumeNumber: 5, isExtra: true })).toBeNull();
	});

	it('finds nothing for a new volume or an empty series', () => {
		expect(findSameVolume(books, { volumeNumber: 6, isExtra: false })).toBeNull();
		expect(findSameVolume([], { volumeNumber: 1, isExtra: false })).toBeNull();
	});
});
