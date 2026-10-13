<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} — Librarian</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-50">
	<div class="space-y-4 px-6 text-center">
		<p class="text-7xl font-bold text-zinc-900 tabular-nums">{$page.status}</p>
		<p class="text-lg text-zinc-500">
			{$page.error?.message || 'Something went wrong.'}
		</p>
		<div class="flex items-center justify-center gap-3 pt-4">
			<button
				onclick={() => history.back()}
				class="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
			>
				Go Back
			</button>
			<a
				href="/"
				class="inline-flex h-10 items-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
			>
				Dashboard
			</a>
		</div>
	</div>
</div>
