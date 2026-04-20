import { env } from '$env/dynamic/private';
import * as crypto from 'crypto';

const AUTH_SECRET = env.AUTH_SECRET || 'librarian-default-secret-change-me';
const AUTH_PASSWORD = env.AUTH_PASSWORD || 'librarian';

const COOKIE_NAME = 'librarian_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Verify the provided password against the AUTH_PASSWORD env var.
 */
export function verifyPassword(password: string): boolean {
	return password === AUTH_PASSWORD;
}

/**
 * Create a signed session token.
 * Uses HMAC-SHA256 to sign a timestamp, so we can verify the cookie wasn't tampered with.
 */
export function createSessionToken(): string {
	const timestamp = Date.now().toString();
	const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(timestamp).digest('hex');
	return `${timestamp}.${hmac}`;
}

/**
 * Verify a session token is valid (signature matches).
 */
export function verifySessionToken(token: string): boolean {
	const parts = token.split('.');
	if (parts.length !== 2) return false;

	const [timestamp, signature] = parts;
	const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(timestamp).digest('hex');

	// Constant-time comparison to prevent timing attacks
	try {
		return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
	} catch {
		return false;
	}
}

/**
 * Get cookie configuration for the session cookie.
 */
export function getSessionCookieOptions() {
	return {
		name: COOKIE_NAME,
		maxAge: COOKIE_MAX_AGE,
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: env.NODE_ENV === 'production'
	};
}

export { COOKIE_NAME };
