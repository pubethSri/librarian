import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyPassword, createSessionToken, getSessionCookieOptions, COOKIE_NAME } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	// If already authenticated, redirect to home
	const sessionToken = cookies.get(COOKIE_NAME);
	if (sessionToken) {
		// We don't verify here to avoid double-checking; hooks.server.ts handles it
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		if (!verifyPassword(password)) {
			return fail(400, { error: 'Invalid password' });
		}

		// Set the session cookie
		const token = createSessionToken();
		const cookieOptions = getSessionCookieOptions();

		cookies.set(cookieOptions.name, token, {
			path: cookieOptions.path,
			maxAge: cookieOptions.maxAge,
			httpOnly: cookieOptions.httpOnly,
			sameSite: cookieOptions.sameSite,
			secure: cookieOptions.secure
		});

		// Redirect to the intended page or home
		const redirectTo = url.searchParams.get('redirectTo') ?? '/';
		throw redirect(303, redirectTo);
	}
};
