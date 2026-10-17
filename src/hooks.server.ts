import type { Handle, ServerInit } from '@sveltejs/kit';
import { json, redirect } from '@sveltejs/kit';
import { assertAuthEnv, verifySessionToken, COOKIE_NAME } from '$lib/server/auth';
import { isSecureRequest } from '$lib/server/authCore';

/** Refuse to start without AUTH_PASSWORD / AUTH_SECRET */
export const init: ServerInit = () => {
	assertAuthEnv();
};

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/api/health'];

function isPublic(pathname: string): boolean {
	return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Allow public paths
	if (isPublic(pathname)) {
		return resolve(event);
	}

	// Allow static assets
	if (pathname.startsWith('/_app') || pathname.startsWith('/favicon')) {
		return resolve(event);
	}

	// Check for valid session cookie
	const sessionToken = event.cookies.get(COOKIE_NAME);

	if (!sessionToken || !verifySessionToken(sessionToken)) {
		if (sessionToken) {
			const secure = isSecureRequest(event.url, event.request.headers);
			event.cookies.delete(COOKIE_NAME, { path: '/', secure });
		}

		// API callers get JSON they can act on, not the login page's HTML
		if (pathname.startsWith('/api/')) {
			return json({ error: 'Session expired — sign in again' }, { status: 401 });
		}

		// Redirect to login, preserving the intended destination
		const target = pathname + event.url.search;
		const redirectTo =
			target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`;
		redirect(303, redirectTo);
	}

	// User is authenticated — attach info to locals for downstream use
	event.locals.authenticated = true;

	return resolve(event);
};
