import { toast } from 'svelte-sonner';

/** Thrown in place of a `/api/*` 401 response, so callers never parse it as data */
export class SessionExpiredError extends Error {
	constructor() {
		super('Session expired — sign in again');
		this.name = 'SessionExpiredError';
	}
}

/** Query retry rule: never retry a request the server refused for an expired session */
export function retryUnlessExpired(failureCount: number, error: unknown): boolean {
	return !(error instanceof SessionExpiredError) && failureCount < 3;
}

function isApiCall(input: RequestInfo | URL): boolean {
	const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	const url = new URL(raw, window.location.href);
	return url.origin === window.location.origin && url.pathname.startsWith('/api/');
}

/**
 * Wrap `window.fetch` once: a same-origin `/api/*` call answered with 401 shows
 * one persistent "Session expired" toast (with a Sign in button that comes back
 * here afterwards) and rejects with `SessionExpiredError`.
 */
export function installSessionGuard(): void {
	const original = window.fetch;
	if ((original as { sessionGuard?: boolean }).sessionGuard) return;

	const guarded = async (input: RequestInfo | URL, init?: RequestInit) => {
		const res = await original(input, init);
		if (res.status !== 401 || !isApiCall(input)) return res;

		toast.error('Session expired — sign in again', {
			id: 'session-expired',
			duration: Infinity,
			action: {
				label: 'Sign in',
				onClick: () => {
					// Back to wherever the user is by then
					const here = window.location.pathname + window.location.search;
					window.location.href = `/login?redirectTo=${encodeURIComponent(here)}`;
				}
			}
		});
		throw new SessionExpiredError();
	};
	(guarded as { sessionGuard?: boolean }).sessionGuard = true;
	window.fetch = guarded;
}
