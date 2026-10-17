import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	verifyPassword,
	verifySessionToken,
	createSessionToken,
	getSessionCookieOptions,
	loginLimiter,
	COOKIE_NAME
} from '$lib/server/auth';
import { isSecureRequest, safeRedirect } from '$lib/server/authCore';

export const load: PageServerLoad = async ({ cookies, url, request }) => {
	const sessionToken = cookies.get(COOKIE_NAME);
	if (sessionToken) {
		// Only a valid session skips the login page; a stale one would loop with the hook
		if (verifySessionToken(sessionToken)) {
			redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
		}
		cookies.delete(COOKIE_NAME, { path: '/', secure: isSecureRequest(url, request.headers) });
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const client = getClientAddress();
		const now = Date.now();

		const wait = loginLimiter.retryAfter(client, now);
		if (wait > 0) {
			const minutes = Math.ceil(wait / 60_000);
			return fail(429, {
				error: `Too many attempts — try again in ${minutes} minute${minutes === 1 ? '' : 's'}`
			});
		}

		const data = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		if (!verifyPassword(password)) {
			loginLimiter.fail(client, now);
			return fail(400, { error: 'Invalid password' });
		}
		loginLimiter.reset(client);

		// Set the session cookie
		const { name, ...cookieOptions } = getSessionCookieOptions(
			isSecureRequest(url, request.headers)
		);
		cookies.set(name, createSessionToken(), cookieOptions);

		// Redirect to the intended page or home
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
