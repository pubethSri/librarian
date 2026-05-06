<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import AppBreadcrumb from '$lib/components/AppBreadcrumb.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { sidebarCollapsed } from '$lib/stores/sidebar';

	let { children } = $props();
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar />

	<!-- Main content area — offset by sidebar width, reactive to collapse -->
	<main
		class="flex-1 transition-all duration-200 {$sidebarCollapsed ? 'md:ml-12' : 'md:ml-44'}"
	>
		<!-- Header with breadcrumb -->
		<header class="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 md:px-8">
			<!-- Spacer for mobile hamburger -->
			<div class="w-10 md:hidden"></div>
			<AppBreadcrumb />
		</header>

		<!-- Page content -->
		<div class="px-6 py-6 md:px-8 md:py-8">
			{@render children()}
		</div>
	</main>
</div>

<Toaster />
