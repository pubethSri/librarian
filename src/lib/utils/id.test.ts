import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { newId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
	it('uses crypto.randomUUID when available (secure context)', () => {
		expect(
			newId({ randomUUID: () => 'from-random-uuid', getRandomValues: () => null as never })
		).toBe('from-random-uuid');
	});

	it('falls back to getRandomValues over plain-HTTP LAN access (no randomUUID)', () => {
		const insecure = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
		const ids = new Set(Array.from({ length: 200 }, () => newId(insecure)));
		expect(ids.size).toBe(200);
		for (const id of ids) expect(id).toMatch(UUID_V4);
	});
});
