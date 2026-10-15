/**
 * A random v4 UUID for client-side temporary ids (staged rows, conditions).
 *
 * `crypto.randomUUID()` exists only in secure contexts (HTTPS or localhost),
 * so it is undefined when the dev server is opened over the LAN by IP
 * (`npm run dev -- --host`). `crypto.getRandomValues()` has no such
 * restriction, so it backs the fallback.
 */
/** The two Web Crypto methods `newId` uses; injectable for tests */
type IdSource = {
	randomUUID?: () => string;
	getRandomValues: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
};

export function newId(c: IdSource = globalThis.crypto): string {
	if (typeof c.randomUUID === 'function') return c.randomUUID();

	const bytes = c.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
