import { createQuery } from '@tanstack/svelte-query';
import type { SeriesDetail } from '$lib/types';

/** Fetch a single series with books, tags, and reading data */
async function fetchSeriesDetail(id: number): Promise<SeriesDetail> {
	const res = await fetch(`/api/series/${id}`);
	if (!res.ok) {
		if (res.status === 404) throw new Error('Series not found');
		throw new Error('Failed to fetch series');
	}
	return res.json();
}

/** Query: single series detail */
export function createSeriesDetailQuery(id: number) {
	return createQuery<SeriesDetail>(() => ({
		queryKey: ['series', id],
		queryFn: () => fetchSeriesDetail(id),
		enabled: id > 0
	}));
}
