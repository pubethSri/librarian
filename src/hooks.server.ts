import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { verifySessionToken, COOKIE_NAME } from '$lib/server/auth';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/api/health'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Allow public paths
	if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
		return resolve(event);
	}

	// Allow static assets
	if (pathname.startsWith('/_app') || pathname.startsWith('/favicon')) {
		return resolve(event);
	}

	// Check for valid session cookie
	const sessionToken = event.cookies.get(COOKIE_NAME);

	if (!sessionToken || !verifySessionToken(sessionToken)) {
		// Redirect to login, preserving the intended destination
		const redirectTo = pathname === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(pathname)}`;
		throw redirect(303, redirectTo);
	}

	// User is authenticated — attach info to locals for downstream use
	event.locals.authenticated = true;

	return resolve(event);
};
