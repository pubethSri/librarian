<script lang="ts">
	import {
		BookOpen,
		LogOut,
		PanelLeftClose,
		PanelLeft
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { sidebarCollapsed } from '$lib/stores/sidebar';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';

	let collapsed = $state($sidebarCollapsed);
	let mobileOpen = $state(false);

	$effect(() => {
		sidebarCollapsed.set(collapsed);
	});

	type NavSection = {
		label: string;
		items: { href: string; label: string }[];
	};

	const sections: NavSection[] = [
		{
			label: 'COLLECTION',
			items: [
				{ href: '/series', label: 'Series' },
				{ href: '/books', label: 'Books' }
			]
		},
		{
			label: 'TOOLS',
			items: [
				{ href: '/bookfairs', label: 'Bookfairs' },
				{ href: '/tags', label: 'Tags' }
			]
		},
		{
			label: 'ANALYTICS',
			items: [{ href: '/insights', label: 'Insights' }]
		}
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	async function handleLogout() {
		await fetch('/api/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<!-- Desktop sidebar -->
<aside
	class="hidden md:flex fixed top-0 left-0 h-screen flex-col border-r border-border bg-sidebar transition-all duration-200 z-40"
	class:w-44={!collapsed}
	class:w-12={collapsed}
>
	<!-- Brand -->
	<div class="flex h-12 items-center border-b border-sidebar-border {collapsed ? 'justify-center px-0' : 'gap-2 px-4'}">
		<a href="/" class="flex items-center gap-2 transition-colors hover:text-sidebar-foreground">
			<BookOpen class="h-4 w-4 shrink-0 text-sidebar-foreground" />
			{#if !collapsed}
				<span class="text-sm font-bold tracking-tight text-sidebar-foreground">Librarian</span>
			{/if}
		</a>
	</div>

	<!-- Nav sections -->
	<nav class="flex-1 overflow-y-auto py-3 {collapsed ? 'px-1' : 'px-3'}">
		{#if collapsed}
			<!-- Collapsed: just a subtle dot per section -->
			<div class="flex flex-col items-center gap-2 pt-2">
				<button
					onclick={() => (collapsed = false)}
					class="flex h-8 w-8 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
					title="Expand sidebar"
				>
					<PanelLeft class="h-4 w-4" />
				</button>
			</div>
		{:else}
			{#each sections as section, i}
				{#if i > 0}
					<div class="my-2"></div>
				{/if}
				<p class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
					{section.label}
				</p>
				{#each section.items as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<a
						href={item.href}
						class="block rounded px-2 py-1.5 text-[13px] font-medium transition-colors {active
							? 'bg-sidebar-accent text-sidebar-accent-foreground'
							: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
					>
						{item.label}
					</a>
				{/each}
			{/each}
		{/if}
	</nav>

	<!-- Footer -->
	<div class="border-t border-sidebar-border py-2 {collapsed ? 'px-1' : 'px-3'} space-y-0.5">
		{#if !collapsed}
			<button
				onclick={() => (collapsed = true)}
				class="flex h-8 w-full items-center gap-2 rounded px-2 text-[13px] font-medium text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
			>
				<PanelLeftClose class="h-3.5 w-3.5 shrink-0" />
				<span>Collapse</span>
			</button>
		{/if}
		<button
			onclick={handleLogout}
			class="flex h-8 w-full items-center rounded text-[13px] font-medium text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground {collapsed ? 'justify-center px-0' : 'gap-2 px-2'}"
		>
			<LogOut class="h-3.5 w-3.5 shrink-0" />
			{#if !collapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>

<!-- Mobile hamburger -->
<div class="md:hidden fixed top-3 left-3 z-50">
	<Sheet.Root bind:open={mobileOpen}>
		<Sheet.Trigger>
			<Button variant="outline" size="icon" class="h-8 w-8">
				<PanelLeft class="h-4 w-4" />
			</Button>
		</Sheet.Trigger>
		<Sheet.Content side="left" class="w-52 p-0">
			<Sheet.Header class="flex h-12 items-center gap-2 border-b border-border px-4">
				<BookOpen class="h-4 w-4 text-foreground" />
				<Sheet.Title class="text-sm font-bold tracking-tight">Librarian</Sheet.Title>
			</Sheet.Header>

			<nav class="px-3 py-3">
				{#each sections as section, i}
					{#if i > 0}
						<div class="my-2"></div>
					{/if}
					<p class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
						{section.label}
					</p>
					{#each section.items as item}
						{@const active = isActive(item.href, $page.url.pathname)}
						<a
							href={item.href}
							onclick={() => (mobileOpen = false)}
							class="block rounded px-2 py-1.5 text-[13px] font-medium transition-colors {active
								? 'bg-accent text-accent-foreground'
								: 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'}"
						>
							{item.label}
						</a>
					{/each}
				{/each}
			</nav>

			<div class="mt-auto border-t border-border px-3 py-2">
				<button
					onclick={handleLogout}
					class="flex h-8 w-full items-center gap-2 rounded px-2 text-[13px] font-medium text-foreground/50 transition-colors hover:bg-accent/50 hover:text-foreground"
				>
					<LogOut class="h-3.5 w-3.5 shrink-0" />
					<span>Logout</span>
				</button>
			</div>
		</Sheet.Content>
	</Sheet.Root>
</div>
