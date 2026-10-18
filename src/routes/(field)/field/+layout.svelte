<script lang="ts">
	// Field Mode's own phone shell: full screen, no sidebar or breadcrumb, a
	// bottom tab bar in thumb reach. Auth still comes from hooks.server.ts and
	// the QueryClientProvider from the root layout.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import FairPicker from '$lib/components/field/FairPicker.svelte';
	import { createBookfairsListQuery } from '$lib/queries/bookfairs';
	import { createFieldSettings, setFieldSettings } from '$lib/field/settings.svelte';
	import { CirclePlus, ListChecks, ListOrdered, Monitor, Search } from '@lucide/svelte';

	let { children } = $props();

	const bookfairsQuery = createBookfairsListQuery();
	const settings = setFieldSettings(createFieldSettings(() => bookfairsQuery.data));

	onMount(() => {
		settings.load();
		const onVisible = () => {
			if (document.visibilityState === 'visible') settings.refreshDay();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	const tabs = [
		{ href: resolve('/field'), label: 'Find', icon: Search },
		{ href: resolve('/field/add'), label: 'Add', icon: CirclePlus },
		{ href: resolve('/field/queue'), label: 'Queue', icon: ListOrdered },
		{ href: resolve('/field/hitlist'), label: 'Hitlist', icon: ListChecks }
	];

	const pathname = $derived(page.url.pathname.replace(/\/$/, ''));

	/** A tab stays marked on its sub-pages (Queue → Add to queue); Find only on /field */
	function isActive(href: string): boolean {
		return pathname === href || (href !== resolve('/field') && pathname.startsWith(`${href}/`));
	}
</script>

<div class="min-h-dvh overflow-x-hidden bg-canvas">
	<header
		class="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden"
	>
		<span class="sr-only">Field Mode</span>
		<FairPicker {settings} fairs={bookfairsQuery.data} />
		<a
			href={resolve('/')}
			class="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
		>
			<Monitor class="h-3.5 w-3.5" /> Desktop
		</a>
	</header>

	<!-- Bottom padding = tab bar + the phone's home-indicator inset -->
	<main class="px-4 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] print:p-0">
		{@render children()}
	</main>

	<nav
		aria-label="Field Mode"
		class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 print:hidden"
	>
		<ul class="mx-auto grid max-w-md grid-cols-4">
			{#each tabs as tab (tab.href)}
				{@const active = isActive(tab.href)}
				<li>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved in `tabs` -->
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						class="relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors {active
							? 'font-semibold text-foreground'
							: 'font-medium text-muted-foreground active:text-foreground'}"
					>
						{#if active}
							<span class="absolute inset-x-5 top-0 h-0.5 rounded-full bg-highlight"></span>
						{/if}
						<tab.icon class="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
						{tab.label}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</li>
			{/each}
		</ul>
	</nav>
</div>

<!-- Top, under the header: the bottom of the screen belongs to the tab bar -->
<Toaster position="top-center" offset={{ top: 56 }} mobileOffset={{ top: 56 }} />
