<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ChevronRight, Home } from '@lucide/svelte';

	// Build breadcrumb segments from the current URL path
	const segmentLabels: Record<string, string> = {
		series: 'Series',
		books: 'Books',
		bookfairs: 'Bookfairs',
		insights: 'Insights',
		tags: 'Tags',
		field: 'Field Mode'
	};

	function getBreadcrumbs(pathname: string) {
		const parts = pathname.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];

		let accumulated = '';
		for (const part of parts) {
			accumulated += `/${part}`;
			const label = segmentLabels[part] || (isNaN(Number(part)) ? part : `#${part}`);
			crumbs.push({ label, href: accumulated });
		}

		return crumbs;
	}
	const crumbs = $derived(getBreadcrumbs($page.url.pathname));
</script>

{#if crumbs.length > 0}
	<nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm text-muted-foreground">
		<a href={resolve('/')} class="flex items-center gap-1 transition-colors hover:text-foreground">
			<Home class="h-3.5 w-3.5" />
		</a>

		{#each crumbs as crumb, i (crumb.href)}
			<ChevronRight class="h-3.5 w-3.5 text-muted-foreground/50" />
			{#if i === crumbs.length - 1}
				<span class="font-medium text-foreground">{crumb.label}</span>
			{:else}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built from page.url.pathname, which already includes the base path -->
				<a href={crumb.href} class="transition-colors hover:text-foreground">
					{crumb.label}
				</a>
			{/if}
		{/each}
	</nav>
{/if}
