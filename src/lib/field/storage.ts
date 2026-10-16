// ─── Field Mode: per-device memory ──────────────────────────────────────────
// Small values kept in localStorage under `librarian.field.*`. Every access is
// wrapped: private mode, blocked storage or a full quota must never break the
// page — a failed read is "nothing remembered", a failed write is ignored.

const PREFIX = 'librarian.field.';

export function readField(key: string): string | null {
	try {
		return localStorage.getItem(PREFIX + key);
	} catch {
		return null;
	}
}

export function writeField(key: string, value: string | null): void {
	try {
		if (value === null) localStorage.removeItem(PREFIX + key);
		else localStorage.setItem(PREFIX + key, value);
	} catch {
		// Storage unavailable: the choice lasts for this visit only
	}
}
