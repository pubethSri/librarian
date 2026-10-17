import { describe, expect, it } from 'vitest';
import {
	SESSION_MAX_AGE_S,
	createRateLimiter,
	isSecureRequest,
	passwordMatches,
	safeRedirect,
	signSessionToken,
	verifySessionTokenAt
} from './authCore';

const SECRET = 'test-secret';
const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('session tokens', () => {
	it('accepts a fresh token signed with the same secret', () => {
		expect(verifySessionTokenAt(signSessionToken(SECRET, NOW), SECRET, NOW)).toBe(true);
	});

	it('rejects another secret, a tampered stamp and garbage', () => {
		const token = signSessionToken(SECRET, NOW);
		expect(verifySessionTokenAt(token, 'other-secret', NOW)).toBe(false);
		const [, sig] = token.split('.');
		expect(verifySessionTokenAt(`${NOW + 1}.${sig}`, SECRET, NOW)).toBe(false);
		expect(verifySessionTokenAt('nope', SECRET, NOW)).toBe(false);
		expect(verifySessionTokenAt('a.b.c', SECRET, NOW)).toBe(false);
		expect(verifySessionTokenAt(`abc.${sig}`, SECRET, NOW)).toBe(false);
	});

	it('expires after the 30-day max age', () => {
		const token = signSessionToken(SECRET, NOW);
		expect(SESSION_MAX_AGE_S).toBe(30 * 24 * 60 * 60);
		expect(verifySessionTokenAt(token, SECRET, NOW + 29 * DAY)).toBe(true);
		expect(verifySessionTokenAt(token, SECRET, NOW + 30 * DAY)).toBe(false);
	});

	it('rejects a token stamped well in the future', () => {
		expect(verifySessionTokenAt(signSessionToken(SECRET, NOW + DAY), SECRET, NOW)).toBe(false);
		expect(verifySessionTokenAt(signSessionToken(SECRET, NOW + 1000), SECRET, NOW)).toBe(true);
	});
});

describe('passwordMatches', () => {
	it('compares exactly', () => {
		expect(passwordMatches('hunter2', 'hunter2')).toBe(true);
		expect(passwordMatches('hunter', 'hunter2')).toBe(false);
		expect(passwordMatches('', 'hunter2')).toBe(false);
	});
});

describe('safeRedirect', () => {
	it('keeps same-origin paths', () => {
		expect(safeRedirect('/field')).toBe('/field');
		expect(safeRedirect('/books?series=3')).toBe('/books?series=3');
	});

	it('falls back to / for anything else', () => {
		for (const bad of [
			null,
			undefined,
			'',
			'field',
			'https://evil.example',
			'//evil.example',
			'/\\evil.example',
			'/\t/evil.example',
			'javascript:alert(1)'
		]) {
			expect(safeRedirect(bad)).toBe('/');
		}
	});
});

describe('isSecureRequest', () => {
	it('trusts the URL protocol', () => {
		expect(isSecureRequest(new URL('https://x.test/'), new Headers())).toBe(true);
		expect(isSecureRequest(new URL('http://x.test/'), new Headers())).toBe(false);
	});

	it("honours a TLS-terminating proxy's x-forwarded-proto", () => {
		const url = new URL('http://localhost:3000/');
		expect(isSecureRequest(url, new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true);
		expect(isSecureRequest(url, new Headers({ 'x-forwarded-proto': 'https, http' }))).toBe(true);
		expect(isSecureRequest(url, new Headers({ 'x-forwarded-proto': 'http' }))).toBe(false);
	});
});

describe('createRateLimiter', () => {
	const MIN = 60_000;

	it('blocks after 5 failures in 10 minutes, per key', () => {
		const limiter = createRateLimiter({ max: 5, windowMs: 10 * MIN });
		for (let i = 0; i < 5; i++) {
			expect(limiter.retryAfter('a', NOW + i * MIN)).toBe(0);
			limiter.fail('a', NOW + i * MIN);
		}
		// Oldest failure (NOW) leaves the window at NOW + 10 min
		expect(limiter.retryAfter('a', NOW + 5 * MIN)).toBe(5 * MIN);
		expect(limiter.retryAfter('b', NOW + 5 * MIN)).toBe(0);
		expect(limiter.retryAfter('a', NOW + 10 * MIN)).toBe(0);
	});

	it('forgets a key on reset (successful sign-in)', () => {
		const limiter = createRateLimiter({ max: 2, windowMs: MIN });
		limiter.fail('a', NOW);
		limiter.fail('a', NOW);
		expect(limiter.retryAfter('a', NOW)).toBeGreaterThan(0);
		limiter.reset('a');
		expect(limiter.retryAfter('a', NOW)).toBe(0);
	});
});
