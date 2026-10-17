import * as crypto from 'crypto';

/**
 * Pure auth helpers (no `$env`), so they can be unit-tested.
 * `auth.ts` wires them to the env secrets.
 */

export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

/** Clock skew tolerated for a token stamped "in the future" */
const FUTURE_SKEW_MS = 60_000;

function sign(secret: string, timestamp: string): string {
	return crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
}

/** A signed session token: `<ms timestamp>.<hmac>` */
export function signSessionToken(secret: string, now: number): string {
	const timestamp = String(now);
	return `${timestamp}.${sign(secret, timestamp)}`;
}

/** True when the signature matches and the token is younger than `maxAgeMs` */
export function verifySessionTokenAt(
	token: string,
	secret: string,
	now: number,
	maxAgeMs = SESSION_MAX_AGE_S * 1000
): boolean {
	const parts = token.split('.');
	if (parts.length !== 2) return false;

	const [timestamp, signature] = parts;
	if (!/^\d+$/.test(timestamp)) return false;

	// Constant-time comparison to prevent timing attacks
	let signed: boolean;
	try {
		signed = crypto.timingSafeEqual(
			Buffer.from(signature, 'hex'),
			Buffer.from(sign(secret, timestamp), 'hex')
		);
	} catch {
		return false;
	}
	if (!signed) return false;

	const age = now - Number(timestamp);
	return age < maxAgeMs && age > -FUTURE_SKEW_MS;
}

/** Constant-time password comparison (hashing first evens out the lengths) */
export function passwordMatches(given: string, expected: string): boolean {
	const a = crypto.createHash('sha256').update(given).digest();
	const b = crypto.createHash('sha256').update(expected).digest();
	return crypto.timingSafeEqual(a, b);
}

/**
 * Where to send the user after sign-in: a same-origin path only
 * (`/x`, not `//x`, `/\x` or `https://…`), else `/`.
 */
export function safeRedirect(target: string | null | undefined): string {
	if (!target || !target.startsWith('/')) return '/';
	if (target.startsWith('//') || target.startsWith('/\\')) return '/';
	// Control characters (tabs, newlines) can smuggle a second slash past browsers
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\\]/.test(target)) return '/';
	return target;
}

/**
 * True when the browser reached us over HTTPS — directly, or through a proxy
 * that terminates TLS and says so in `x-forwarded-proto` (Vercel, Tailscale serve).
 */
export function isSecureRequest(url: URL, headers: Headers): boolean {
	if (url.protocol === 'https:') return true;
	const forwarded = headers.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase();
	return forwarded === 'https';
}

/**
 * In-memory failed-login limiter: `max` failures per key within `windowMs`,
 * then blocked until the oldest failure leaves the window.
 * Per process — on Vercel each warm instance counts on its own, which is
 * still enough to slow down guessing for a single-user app.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
	const failures = new Map<string, number[]>();

	function recent(key: string, now: number): number[] {
		const kept = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
		if (kept.length) failures.set(key, kept);
		else failures.delete(key);
		return kept;
	}

	return {
		/** Milliseconds until `key` may try again; 0 = allowed now */
		retryAfter(key: string, now: number): number {
			const times = recent(key, now);
			if (times.length < max) return 0;
			return windowMs - (now - times[times.length - max]);
		},
		fail(key: string, now: number) {
			failures.set(key, [...recent(key, now), now]);
		},
		reset(key: string) {
			failures.delete(key);
		}
	};
}
