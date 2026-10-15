import { createQuery } from '@tanstack/svelte-query';
import type { Insights } from '$lib/types';

async function fetchInsights(): Promise<Insights> {
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const res = await fetch(`/api/insights?tz=${encodeURIComponent(tz)}`);
	if (!res.ok) throw new Error('Failed to fetch insights');
	return res.json();
}

/**
 * Query: every insight figure.
 *
 * `staleTime: 0` refetches on every visit — book and reading mutations
 * invalidate their own keys, not ['insights'].
 */
export function createInsightsQuery() {
	return createQuery<Insights>(() => ({
		queryKey: ['insights'],
		queryFn: fetchInsights,
		staleTime: 0
	}));
}
