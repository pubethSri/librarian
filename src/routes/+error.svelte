<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} — Librarian</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-50">
	<div class="text-center space-y-4 px-6">
		<p class="text-7xl font-bold tabular-nums text-zinc-900">{$page.status}</p>
		<p class="text-lg text-zinc-500">
			{$page.error?.message || 'Something went wrong.'}
		</p>
		<div class="flex items-center justify-center gap-3 pt-4">
			<button
				onclick={() => history.back()}
				class="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
			>
				Go Back
			</button>
			<a
				href="/"
				class="inline-flex h-10 items-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
			>
				Dashboard
			</a>
		</div>
	</div>
</div>
