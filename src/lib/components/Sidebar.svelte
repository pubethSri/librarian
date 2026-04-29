<script lang="ts">
	import {
		BookOpen,
		Library,
		BookCopy,
		ShoppingBag,
		BarChart3,
		Tags,
		LogOut,
		PanelLeftClose,
		PanelLeft
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';

	let collapsed = $state(false);
	let mobileOpen = $state(false);

	const navItems = [
		{ href: '/series', label: 'Series', icon: Library },
		{ href: '/books', label: 'Books', icon: BookCopy },
		{ href: '/bookfairs', label: 'Bookfairs', icon: ShoppingBag },
		{ href: '/insights', label: 'Insights', icon: BarChart3 },
		{ href: '/tags', label: 'Tags', icon: Tags }
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
	class:w-60={!collapsed}
	class:w-16={collapsed}
>
	<!-- Brand -->
	<div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
		<BookOpen class="h-5 w-5 shrink-0 text-sidebar-foreground" />
		{#if !collapsed}
			<span class="text-lg font-bold tracking-tight text-sidebar-foreground">Librarian</span>
		{/if}
	</div>

	<!-- Nav links -->
	<nav class="flex-1 space-y-1 px-2 py-3">
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			{#if collapsed}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<a
							href={item.href}
							class="flex h-10 w-full items-center justify-center rounded-md transition-colors {active
								? 'bg-sidebar-accent text-sidebar-accent-foreground'
								: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
						>
							<item.icon class="h-5 w-5" />
						</a>
					</Tooltip.Trigger>
					<Tooltip.Content side="right">
						<p>{item.label}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<a
					href={item.href}
					class="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors {active
						? 'bg-sidebar-accent text-sidebar-accent-foreground'
						: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}"
				>
					<item.icon class="h-5 w-5 shrink-0" />
					<span>{item.label}</span>
				</a>
			{/if}
		{/each}
	</nav>

	<!-- Footer: collapse toggle + logout -->
	<div class="border-t border-sidebar-border px-2 py-3 space-y-1">
		<button
			onclick={() => (collapsed = !collapsed)}
			class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
			class:justify-center={collapsed}
		>
			{#if collapsed}
				<PanelLeft class="h-5 w-5" />
			{:else}
				<PanelLeftClose class="h-5 w-5 shrink-0" />
				<span>Collapse</span>
			{/if}
		</button>
		<button
			onclick={handleLogout}
			class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
			class:justify-center={collapsed}
		>
			<LogOut class="h-5 w-5 shrink-0" />
			{#if !collapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>

<!-- Mobile hamburger button -->
<div class="md:hidden fixed top-3 left-3 z-50">
	<Sheet.Root bind:open={mobileOpen}>
		<Sheet.Trigger>
			<Button variant="outline" size="icon" class="h-9 w-9">
				<PanelLeft class="h-5 w-5" />
			</Button>
		</Sheet.Trigger>
		<Sheet.Content side="left" class="w-64 p-0">
			<Sheet.Header class="flex h-14 items-center gap-2 border-b border-border px-4">
				<BookOpen class="h-5 w-5 text-foreground" />
				<Sheet.Title class="text-lg font-bold tracking-tight">Librarian</Sheet.Title>
			</Sheet.Header>

			<nav class="space-y-1 px-2 py-3">
				{#each navItems as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<a
						href={item.href}
						onclick={() => (mobileOpen = false)}
						class="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors {active
							? 'bg-accent text-accent-foreground'
							: 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'}"
					>
						<item.icon class="h-5 w-5 shrink-0" />
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>

			<div class="mt-auto border-t border-border px-2 py-3">
				<button
					onclick={handleLogout}
					class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground"
				>
					<LogOut class="h-5 w-5 shrink-0" />
					<span>Logout</span>
				</button>
			</div>
		</Sheet.Content>
	</Sheet.Root>
</div>
