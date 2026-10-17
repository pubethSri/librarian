import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadInsightsInput } from '$lib/server/insights';
import { computeInsights } from '$lib/insights';

// GET /api/insights?tz=Asia/Bangkok — every figure the Insights page shows.
// `tz` is the viewer's time zone: which calendar day is "today" (stored dates are days).
export const GET: RequestHandler = async ({ url }) => {
	const input = await loadInsightsInput();
	return json(computeInsights(input, new Date(), url.searchParams.get('tz')));
};
