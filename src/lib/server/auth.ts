import { env } from '$env/dynamic/private';
import {
	SESSION_MAX_AGE_S,
	createRateLimiter,
	passwordMatches,
	signSessionToken,
	verifySessionTokenAt
} from './authCore';

const COOKIE_NAME = 'librarian_session';

/**
 * The password and signing secret. No fallbacks: a missing value would mean a
 * guessable password or a forgeable cookie, so the server refuses to run.
 */
function authEnv(): { password: string; secret: string } {
	const password = env.AUTH_PASSWORD;
	const secret = env.AUTH_SECRET;
	if (!password || !secret) {
		throw new Error(
			'AUTH_PASSWORD and AUTH_SECRET must be set (see .env.example) — refusing to start without them'
		);
	}
	return { password, secret };
}

/** Called from the server `init` hook so a missing secret fails at startup */
export function assertAuthEnv(): void {
	authEnv();
}

/**
 * Verify the provided password against the AUTH_PASSWORD env var.
 */
export function verifyPassword(password: string): boolean {
	return passwordMatches(password, authEnv().password);
}

/**
 * Create a signed session token.
 * Uses HMAC-SHA256 to sign a timestamp, so we can verify the cookie wasn't tampered with.
 */
export function createSessionToken(): string {
	return signSessionToken(authEnv().secret, Date.now());
}

/**
 * Verify a session token: signature matches and it is younger than the cookie's max age.
 */
export function verifySessionToken(token: string): boolean {
	return verifySessionTokenAt(token, authEnv().secret, Date.now());
}

/**
 * Get cookie configuration for the session cookie.
 * `secure` follows the request's protocol (see `isSecureRequest`), not NODE_ENV.
 */
export function getSessionCookieOptions(secure: boolean) {
	return {
		name: COOKIE_NAME,
		maxAge: SESSION_MAX_AGE_S,
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure
	};
}

/** Failed sign-ins: 5 per 10 minutes per client address */
export const loginLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

export { COOKIE_NAME };
